import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as storage from "../storage";

const router = Router();

// GET /api/notifications
router.get("/", authenticateToken, async (req, res) => {
    try {
        const notifications = await storage.getNotifications(req.user!.id);
        res.json(notifications);
    } catch (err) {
        console.error("Get notifications error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/notifications/unread-count
router.get("/unread-count", authenticateToken, async (req, res) => {
    try {
        const count = await storage.getUnreadCount(req.user!.id);
        res.json({ count });
    } catch (err) {
        console.error("Get unread count error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authenticateToken, async (req, res) => {
    try {
        await storage.markNotificationRead(req.params.id, req.user!.id);
        res.json({ message: "Notification marked as read" });
    } catch (err) {
        console.error("Mark read error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
