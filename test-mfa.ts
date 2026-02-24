import { api } from './lib/api';
import * as speakeasy from 'speakeasy';

(async () => {
    try {
        console.log("1. Registering test user...");
        const email = `testmfa_${Date.now()}@test.com`;
        const regRes = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "MFA Test User", email, password: "password123", role: "EMPLOYEE" })
        });
        const regData = await regRes.json();
        const token = regData.accessToken;

        console.log("2. Initiating MFA setup...");
        const setupRes = await fetch("http://localhost:5000/api/auth/mfa/setup", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const setupData = await setupRes.json();
        const secret = setupData.secret;
        console.log("Got secret:", secret);

        console.log("3. Generating TOTP code...");
        const code = speakeasy.totp({ secret, encoding: "base32" });

        console.log("4. Verifying MFA setup with code:", code);
        const verifyRes = await fetch("http://localhost:5000/api/auth/mfa/verify", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ code, secret })
        });
        console.log("Verify status:", verifyRes.status);

        console.log("5. Logging in with MFA enabled...");
        const loginRes = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: "password123" })
        });
        const loginData = await loginRes.json();
        console.log("Login intercepted? mfaRequired =", loginData.mfaRequired);

        const mfaToken = loginData.mfaToken;
        const loginCode = speakeasy.totp({ secret, encoding: "base32" });

        console.log("6. Submitting MFA challenge code:", loginCode);
        const mfaLoginRes = await fetch("http://localhost:5000/api/auth/login/mfa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mfaToken, code: loginCode })
        });
        const mfaLoginData = await mfaLoginRes.json();

        if (mfaLoginData.accessToken) {
            console.log("SUCCESS! MFA flow is fully functional.");
        } else {
            console.error("FAILED to get access token:", mfaLoginData);
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
})();
