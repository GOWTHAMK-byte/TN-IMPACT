import { Router } from "express";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema, mfaLoginSchema } from "@shared/schema";
import * as storage from "../storage";
import { sendOtpEmail } from "../email";

const router = Router();
const googleClient = new OAuth2Client(config.googleClientId, config.googleClientSecret);

// POST /api/auth/login
router.post("/login", validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await storage.getUserByEmail(email);

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // SSO-only users cannot log in with email/password
        if (!user.passwordHash) {
            return res.status(401).json({ message: "This account uses Google Sign-In. Please use the Google button to log in." });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Account is deactivated" });
        }

        // Always require Mobile OTP MFA for email/password login
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await storage.saveUserOtp(user.id, otpCode, otpExpiresAt);

        // Dispatch OTP via Email using Nodemailer
        await sendOtpEmail(user.email, otpCode);

        const mfaToken = jwt.sign({ id: user.id }, config.jwtSecret, {
            expiresIn: "5m",
        } as jwt.SignOptions);

        return res.json({
            mfaRequired: true,
            mfaToken,
        });

        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };

        const accessToken = jwt.sign(tokenPayload, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn,
        } as jwt.SignOptions);

        const refreshToken = jwt.sign(
            { id: user.id },
            config.jwtRefreshSecret,
            { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
        );

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await storage.saveRefreshToken(user.id, refreshToken, expiresAt);

        // Audit log
        await storage.createAuditLog({
            userId: user.id,
            action: "login",
            entityType: "auth",
            details: "User logged in",
        });

        // Return user info (without passwordHash)
        const { passwordHash: _, otpCode: __, otpExpiresAt: ___, ...safeUser } = user;

        res.json({
            user: safeUser,
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/auth/register
router.post("/register", validate(registerSchema), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if email already exists
        const existing = await storage.getUserByEmail(email);
        if (existing) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const username = email.split("@")[0] + "_" + Date.now().toString(36);
        const user = await storage.createUser({
            username,
            email,
            name,
            role: role || "EMPLOYEE",
            department: "General",
            avatar: name.substring(0, 2).toUpperCase(),
            passwordHash,
        });

        if (!user) {
            return res.status(500).json({ message: "Failed to create account" });
        }

        // Generate tokens
        const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };

        const accessToken = jwt.sign(tokenPayload, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn,
        } as jwt.SignOptions);

        const refreshToken = jwt.sign(
            { id: user.id }, config.jwtRefreshSecret,
            { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
        );

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await storage.saveRefreshToken(user.id, refreshToken, expiresAt);

        await storage.createAuditLog({
            userId: user.id, action: "register",
            entityType: "auth", details: "New user registered",
        });

        const { passwordHash: _, ...safeUser } = user;

        res.status(201).json({
            user: safeUser,
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/auth/google
router.post("/google", async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: "Google ID token is required" });
        }

        if (!config.googleClientId) {
            return res.status(500).json({ message: "Google OAuth is not configured on the server" });
        }

        // Verify the Google ID token
        let payload: any;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: config.googleClientId,
            });
            payload = ticket.getPayload();
        } catch (err) {
            console.error("Google token verification failed:", err);
            return res.status(401).json({ message: "Invalid Google ID token" });
        }

        if (!payload || !payload.sub || !payload.email) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name || email.split("@")[0];
        const avatar = payload.picture || "";

        // 1. Check if user exists by SSO ID
        let user = await storage.getUserBySsoId("google", googleId);

        // 2. If not found by SSO ID, check by email
        if (!user) {
            user = await storage.getUserByEmail(email);

            if (user) {
                // Link SSO to existing account
                await storage.linkSsoToUser(user.id, "google", googleId);
                // Refresh user data
                user = await storage.getUserById(user.id);
            }
        }

        // 3. If still not found, create a new user
        if (!user) {
            const username = email.split("@")[0] + "_" + Date.now().toString(36);
            user = await storage.createUser({
                username,
                email,
                name,
                role: "EMPLOYEE",
                department: "General",
                avatar,
                ssoProvider: "google",
                ssoProviderId: googleId,
            });
        }

        if (!user!.isActive) {
            return res.status(403).json({ message: "Account is deactivated" });
        }

        // Generate JWT tokens
        const tokenPayload = {
            id: user!.id,
            email: user!.email,
            role: user!.role,
            name: user!.name,
        };

        const accessToken = jwt.sign(tokenPayload, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn,
        } as jwt.SignOptions);

        const refreshTokenStr = jwt.sign(
            { id: user!.id },
            config.jwtRefreshSecret,
            { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
        );

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await storage.saveRefreshToken(user!.id, refreshTokenStr, expiresAt);

        // Audit log
        await storage.createAuditLog({
            userId: user!.id,
            action: "google_login",
            entityType: "auth",
            details: "User logged in via Google SSO",
        });

        const { passwordHash, ...safeUser } = user!;

        res.json({
            user: safeUser,
            accessToken,
            refreshToken: refreshTokenStr,
        });
    } catch (err) {
        console.error("Google auth error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/auth/google/callback — Backend redirect handler for mobile OAuth
// Google redirects here after auth, then we redirect to the app via custom scheme
router.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;
        if (!code || typeof code !== "string") {
            return res.status(400).send("Missing authorization code");
        }

        // Determine the callback URL (must match what was sent to Google)
        // Use x-forwarded-proto header if behind a proxy/tunnel (e.g. localtunnel, nginx)
        const protocol = (req.get("x-forwarded-proto") || req.protocol).split(",")[0].trim();
        const callbackUrl = `${protocol}://${req.get("host")}/api/auth/google/callback`;
        console.log("Google callback - redirect_uri:", callbackUrl);

        // Exchange auth code for tokens
        const { tokens } = await googleClient.getToken({
            code,
            redirect_uri: callbackUrl,
        });

        if (!tokens.id_token) {
            return res.status(400).send("No ID token received from Google");
        }

        // Verify the ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: config.googleClientId,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.sub || !payload.email) {
            return res.status(400).send("Invalid token payload");
        }

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name || email.split("@")[0];
        const avatar = payload.picture || "";

        // Find or create user (same logic as POST /api/auth/google)
        let user = await storage.getUserBySsoId("google", googleId);

        if (!user) {
            user = await storage.getUserByEmail(email);
            if (user) {
                await storage.linkSsoToUser(user.id, "google", googleId);
                user = await storage.getUserById(user.id);
            }
        }

        if (!user) {
            const username = email.split("@")[0] + "_" + Date.now().toString(36);
            user = await storage.createUser({
                username, email, name,
                role: "EMPLOYEE", department: "General",
                avatar, ssoProvider: "google", ssoProviderId: googleId,
            });
        }

        if (!user!.isActive) {
            return res.status(403).send("Account is deactivated");
        }

        // Generate JWT tokens
        const tokenPayload = {
            id: user!.id, email: user!.email, role: user!.role, name: user!.name,
        };

        const accessToken = jwt.sign(tokenPayload, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn,
        } as jwt.SignOptions);

        const refreshTokenStr = jwt.sign(
            { id: user!.id }, config.jwtRefreshSecret,
            { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
        );

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await storage.saveRefreshToken(user!.id, refreshTokenStr, expiresAt);

        await storage.createAuditLog({
            userId: user!.id, action: "google_login",
            entityType: "auth", details: "User logged in via Google SSO (mobile)",
        });

        const { passwordHash, ...safeUser } = user!;
        const userData = encodeURIComponent(JSON.stringify(safeUser));

        // Read the return URL from the state parameter (e.g. exp://192.168.1.9:8081)
        const returnUrl = (req.query.state as string) || 'servicehub://auth';
        const separator = returnUrl.includes('?') ? '&' : '?';
        const deepLink = `${returnUrl}${separator}accessToken=${accessToken}&refreshToken=${refreshTokenStr}&user=${userData}`;
        console.log("Redirecting to deep link:", deepLink.substring(0, 100) + "...");
        res.redirect(deepLink);
    } catch (err) {
        console.error("Google callback error:", err);
        res.status(500).send("Authentication failed. Please try again.");
    }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token required" });
        }

        // Verify token
        let decoded: any;
        try {
            decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
        } catch {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        // Check if token exists in DB
        const storedToken = await storage.getRefreshToken(refreshToken);
        if (!storedToken || storedToken.expiresAt < new Date()) {
            return res.status(401).json({ message: "Refresh token expired or revoked" });
        }

        const user = await storage.getUserById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ message: "User not found or inactive" });
        }

        // Rotate refresh token
        await storage.deleteRefreshToken(refreshToken);

        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };

        const newAccessToken = jwt.sign(tokenPayload, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn,
        } as jwt.SignOptions);

        const newRefreshToken = jwt.sign(
            { id: user.id },
            config.jwtRefreshSecret,
            { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
        );

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await storage.saveRefreshToken(user.id, newRefreshToken, expiresAt);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (err) {
        console.error("Refresh error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/auth/logout
router.post("/logout", authenticateToken, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await storage.deleteRefreshToken(refreshToken);
        }
        // Optionally delete all tokens for user
        if (req.user) {
            await storage.deleteUserRefreshTokens(req.user.id);
        }

        await storage.createAuditLog({
            userId: req.user!.id,
            action: "logout",
            entityType: "auth",
            details: "User logged out",
        });

        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/auth/me
router.get("/me", authenticateToken, async (req, res) => {
    try {
        const user = await storage.getUserById(req.user!.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const { passwordHash, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        console.error("Get profile error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;

// POST /api/auth/login/mfa
router.post("/login/mfa", validate(mfaLoginSchema), async (req, res) => {
    try {
        const { mfaToken, code } = req.body;

        // Verify the short-lived MFA token
        const decoded = jwt.verify(mfaToken, config.jwtSecret) as { id: string };
        const user = await storage.getUserById(decoded.id);

        if (!user || !user.otpCode || !user.otpExpiresAt) {
            return res.status(401).json({ message: "Invalid or expired MFA request" });
        }

        if (user.otpCode !== code || user.otpExpiresAt < new Date()) {
            return res.status(401).json({ message: "Invalid or expired OTP code" });
        }

        // Clear OTP after successful verification
        await storage.clearUserOtp(user.id);

        // Issue regular session tokens
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };

        const accessToken = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
        const refreshToken = jwt.sign({ id: user.id }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await storage.saveRefreshToken(user.id, refreshToken, expiresAt);

        // Audit log
        await storage.createAuditLog({
            userId: user.id,
            action: "login",
            entityType: "auth",
            details: "User logged in via MFA",
        });

        const { passwordHash: _, otpCode: __, otpExpiresAt: ___, ...safeUser } = user;

        res.json({
            user: safeUser,
            accessToken,
            refreshToken,
        });
    } catch (err: any) {
        if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "MFA session expired, please login again" });
        }
        console.error("MFA Login error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});



