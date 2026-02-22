import { Router } from "express";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { config } from "../config";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginSchema } from "@shared/schema";
import * as storage from "../storage";

const router = Router();

// POST /api/auth/login
router.post("/login", validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await storage.getUserByEmail(email);

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Account is deactivated" });
        }

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
        const { passwordHash, ...safeUser } = user;

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
