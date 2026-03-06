import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { insertProjectSchema } from "@shared/schema";
import * as storage from "../storage";
import { z } from "zod";

const router = Router();

// GET /api/projects - everyone can list projects to select them
router.get("/", authenticateToken, async (req, res) => {
    try {
        const projectsList = await storage.getProjects();
        res.json(projectsList);
    } catch (err) {
        console.error("Get projects error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/projects/:id
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const project = await storage.getProjectById(req.params.id as string);
        if (!project) return res.status(404).json({ message: "Project not found" });
        res.json(project);
    } catch (err) {
        console.error("Get project error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/projects - only HR/Super Admins
router.post("/", authenticateToken, requireRole("SUPER_ADMIN", "HR_ADMIN"), validate(insertProjectSchema), async (req, res) => {
    try {
        const project = await storage.createProject(req.body);

        await storage.createAuditLog({
            userId: req.user!.id,
            action: "create",
            entityType: "project",
            entityId: project.id,
            details: `Created project: ${project.name}`,
        });

        res.status(201).json(project);
    } catch (err) {
        console.error("Create project error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// PATCH /api/projects/:id - only HR/Super Admins
router.patch("/:id", authenticateToken, requireRole("SUPER_ADMIN", "HR_ADMIN"), async (req, res) => {
    try {
        const project = await storage.getProjectById(req.params.id as string);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const updated = await storage.updateProject(project.id, req.body);

        await storage.createAuditLog({
            userId: req.user!.id,
            action: "update",
            entityType: "project",
            entityId: project.id,
            details: `Updated project: ${updated?.name}`,
        });

        res.json(updated);
    } catch (err) {
        console.error("Update project error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
