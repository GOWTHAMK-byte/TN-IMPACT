import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
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
        const user = await storage.getUserById(req.params.id as string);
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

// PATCH /api/users/:id - Admins can update a user (e.g. assign projectId)
router.patch("/:id", authenticateToken, requireRole("SUPER_ADMIN", "HR_ADMIN", "MANAGER"), async (req, res) => {
    try {
        const { projectId, managerId, role, department, title } = req.body;

        const user = await storage.getUserById(req.params.id as string);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const updatedUser = await storage.updateUser(user.id, {
            ...(projectId !== undefined && { projectId: projectId || null }),
            ...(managerId !== undefined && { managerId: managerId || null }),
            ...(role !== undefined && { role }),
            ...(department !== undefined && { department }),
            ...(title !== undefined && { title }),
        });

        await storage.createAuditLog({
            userId: req.user!.id,
            action: "update",
            entityType: "user",
            entityId: user.id,
            details: `Updated user profile/assignments`,
        });

        const { passwordHash, ...safeUser } = updatedUser;
        res.json(safeUser);
    } catch (err) {
        console.error("Update user error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
