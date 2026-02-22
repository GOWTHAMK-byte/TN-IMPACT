import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as storage from "../storage";

const router = Router();

// GET /api/users – directory listing
router.get("/", authenticateToken, async (req, res) => {
    try {
        const { department, role, search } = req.query;
        const users = await storage.getUsers({
            department: department as string,
            role: role as any,
            search: search as string,
        });

        // Strip passwordHash from all results
        const safeUsers = users.map(({ passwordHash, ...u }) => u);
        res.json(safeUsers);
    } catch (err) {
        console.error("Get users error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/users/:id
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const user = await storage.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const { passwordHash, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
