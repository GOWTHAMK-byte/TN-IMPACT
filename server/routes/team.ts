import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import * as storage from "../storage";

const router = Router();

// GET /api/team — list current team members for the authenticated manager
router.get("/", authenticateToken, requireRole("MANAGER"), async (req, res) => {
    try {
        const members = await storage.getTeamMembers(req.user!.id);
        const safeMembers = members.map(({ passwordHash, ...u }) => u);
        res.json(safeMembers);
    } catch (err) {
        console.error("Get team members error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/team/my-team — view team for ANY authenticated user (read-only)
// Managers see their direct reports; Employees see colleagues under the same manager
router.get("/my-team", authenticateToken, async (req, res) => {
    try {
        const currentUser = await storage.getUserById(req.user!.id);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        let members: any[] = [];
        if (currentUser.role === "MANAGER") {
            members = await storage.getTeamMembers(currentUser.id);
        } else if (currentUser.managerId) {
            // Employee: get all users with the same managerId (colleagues)
            members = await storage.getTeamMembers(currentUser.managerId);
        } else {
            members = [];
        }

        const safeMembers = members.map(({ passwordHash, ...u }: any) => u);
        res.json(safeMembers);
    } catch (err) {
        console.error("Get my team error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/team/search?q=... — search employees to add to team
router.get("/search", authenticateToken, requireRole("MANAGER"), async (req, res) => {
    try {
        const { q } = req.query;
        const allUsers = await storage.getUsers({ search: q as string });
        // Exclude the manager themselves
        const filtered = allUsers
            .filter((u) => u.id !== req.user!.id)
            .map(({ passwordHash, ...u }) => u);
        res.json(filtered);
    } catch (err) {
        console.error("Search employees error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/team/add — add employee to team
router.post("/add", authenticateToken, requireRole("MANAGER"), async (req, res) => {
    try {
        const { employeeId } = req.body;
        if (!employeeId) {
            return res.status(400).json({ message: "employeeId is required" });
        }

        const employee = await storage.getUserById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const updated = await storage.addTeamMember(req.user!.id, employeeId);

        await storage.createAuditLog({
            userId: req.user!.id,
            action: "add_team_member",
            entityType: "user",
            entityId: employeeId,
            details: `Added ${employee.name} to team`,
        });

        const { passwordHash, ...safeUser } = updated;
        res.json(safeUser);
    } catch (err) {
        console.error("Add team member error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// DELETE /api/team/:id — remove employee from team
router.delete("/:id", authenticateToken, requireRole("MANAGER"), async (req, res) => {
    try {
        const employeeId = req.params.id as string;
        const employee = await storage.getUserById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Only allow removing from own team
        if (employee.managerId !== req.user!.id) {
            return res.status(403).json({ message: "This employee is not on your team" });
        }

        const updated = await storage.removeTeamMember(employeeId);

        await storage.createAuditLog({
            userId: req.user!.id,
            action: "remove_team_member",
            entityType: "user",
            entityId: employeeId,
            details: `Removed ${employee.name} from team`,
        });

        const { passwordHash, ...safeUser } = updated;
        res.json(safeUser);
    } catch (err) {
        console.error("Remove team member error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
