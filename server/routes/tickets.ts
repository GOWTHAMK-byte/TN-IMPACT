import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createTicketSchema } from "@shared/schema";
import * as storage from "../storage";
import { z } from "zod";

const router = Router();

const updateStatusSchema = z.object({
    status: z.enum(["Open", "Assigned", "In_Progress", "Resolved", "Closed", "Escalated"]),
    assignedTo: z.string().optional(),
});

const addCommentSchema = z.object({
    content: z.string().min(1),
});

// POST /api/tickets
router.post("/", authenticateToken, validate(createTicketSchema), async (req, res) => {
    try {
        const ticket = await storage.createTicket({
            ...req.body,
            createdBy: req.user!.id,
        });

        await storage.createAuditLog({
            userId: req.user!.id,
            action: "create",
            entityType: "ticket",
            entityId: ticket.id,
            details: `Created ticket: ${req.body.title}`,
        });

        res.status(201).json(ticket);
    } catch (err) {
        console.error("Create ticket error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/tickets
router.get("/", authenticateToken, async (req, res) => {
    try {
        const role = req.user!.role;
        let ticketList;

        if (role === "IT_ADMIN" || role === "SUPER_ADMIN") {
            ticketList = await storage.getTickets({ all: true });
        } else {
            ticketList = await storage.getTickets({ createdBy: req.user!.id });
        }

        // Enrich with user names
        const enriched = await Promise.all(
            ticketList.map(async (t) => {
                const creator = await storage.getUserById(t.createdBy);
                const assignee = t.assignedTo ? await storage.getUserById(t.assignedTo) : null;
                const comments = await storage.getTicketComments(t.id);
                const enrichedComments = await Promise.all(
                    comments.map(async (c) => {
                        const author = await storage.getUserById(c.authorId);
                        return { ...c, authorName: author?.name || "Unknown" };
                    })
                );
                return {
                    ...t,
                    createdByName: creator?.name || "Unknown",
                    assignedToName: assignee?.name || undefined,
                    comments: enrichedComments,
                };
            })
        );

        res.json(enriched);
    } catch (err) {
        console.error("Get tickets error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/tickets/:id
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const ticket = await storage.getTicketById(req.params.id);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

        const creator = await storage.getUserById(ticket.createdBy);
        const assignee = ticket.assignedTo ? await storage.getUserById(ticket.assignedTo) : null;
        const comments = await storage.getTicketComments(ticket.id);
        const enrichedComments = await Promise.all(
            comments.map(async (c) => {
                const author = await storage.getUserById(c.authorId);
                return { ...c, authorName: author?.name || "Unknown" };
            })
        );

        res.json({
            ...ticket,
            createdByName: creator?.name || "Unknown",
            assignedToName: assignee?.name || undefined,
            comments: enrichedComments,
        });
    } catch (err) {
        console.error("Get ticket error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// PATCH /api/tickets/:id/status
router.patch(
    "/:id/status",
    authenticateToken,
    requireRole("IT_ADMIN"),
    validate(updateStatusSchema),
    async (req, res) => {
        try {
            const ticket = await storage.getTicketById(req.params.id);
            if (!ticket) return res.status(404).json({ message: "Ticket not found" });

            await storage.updateTicketStatus(ticket.id, req.body.status, req.body.assignedTo);

            // Notify creator
            await storage.createNotification({
                userId: ticket.createdBy,
                title: "Ticket Updated",
                body: `Your ticket "${ticket.title}" is now ${req.body.status.replace("_", " ")}`,
                type: "status_update",
                entityType: "ticket",
                entityId: ticket.id,
            });

            await storage.createAuditLog({
                userId: req.user!.id,
                action: "status_change",
                entityType: "ticket",
                entityId: ticket.id,
                details: `Status changed to ${req.body.status}`,
            });

            res.json({ message: "Ticket status updated", status: req.body.status });
        } catch (err) {
            console.error("Update ticket status error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

// POST /api/tickets/:id/comments
router.post("/:id/comments", authenticateToken, validate(addCommentSchema), async (req, res) => {
    try {
        const ticket = await storage.getTicketById(req.params.id);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

        const comment = await storage.addTicketComment({
            ticketId: ticket.id,
            authorId: req.user!.id,
            content: req.body.content,
        });

        // Notify ticket creator if commenter is not the creator
        if (ticket.createdBy !== req.user!.id) {
            await storage.createNotification({
                userId: ticket.createdBy,
                title: "New Comment",
                body: `${req.user!.name} commented on "${ticket.title}"`,
                type: "status_update",
                entityType: "ticket",
                entityId: ticket.id,
            });
        }

        // Notify assignee if exists and not the commenter
        if (ticket.assignedTo && ticket.assignedTo !== req.user!.id) {
            await storage.createNotification({
                userId: ticket.assignedTo,
                title: "New Comment",
                body: `${req.user!.name} commented on "${ticket.title}"`,
                type: "status_update",
                entityType: "ticket",
                entityId: ticket.id,
            });
        }

        const author = await storage.getUserById(req.user!.id);
        res.status(201).json({ ...comment, authorName: author?.name || "Unknown" });
    } catch (err) {
        console.error("Add comment error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
