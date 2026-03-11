import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { sendMessageSchema } from "@shared/schema";
import * as storage from "../storage";

const router = Router();

// GET /api/chat/unread — get unread counts for team and private chats
router.get("/unread", authenticateToken, async (req, res) => {
    try {
        const currentUser = await storage.getUserById(req.user!.id);
        if (!currentUser) return res.status(404).json({ message: "User not found" });

        const teamManagerId = currentUser.role === "MANAGER" ? currentUser.id : currentUser.managerId;
        const unreadCounts = await storage.getUnreadChatCounts(req.user!.id, teamManagerId || null);
        
        res.json(unreadCounts);
    } catch (err) {
        console.error("Get unread count error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/chat/read — mark a chat room as read
router.post("/read", authenticateToken, async (req, res) => {
    try {
        const { chatRoomId } = req.body;
        if (!chatRoomId) return res.status(400).json({ message: "chatRoomId is required" });
        
        await storage.markChatRead(req.user!.id, chatRoomId);
        res.json({ success: true });
    } catch (err) {
        console.error("Mark chat read error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/chat/team/:managerId — get team group chat messages
router.get("/team/:managerId", authenticateToken, async (req, res) => {
    try {
        const { managerId } = req.params;
        const { before, limit } = req.query;

        // Verify the user belongs to this team
        const currentUser = await storage.getUserById(req.user!.id);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const isTeamMember =
            currentUser.id === managerId ||
            currentUser.managerId === managerId;

        if (!isTeamMember) {
            return res.status(403).json({ message: "You are not a member of this team" });
        }

        const beforeStr = typeof before === "string" ? before : undefined;
        const messages = await storage.getTeamChatMessages(
            managerId,
            limit ? parseInt(limit as string) : 50,
            beforeStr,
        );

        // Enrich messages with sender info
        const enriched = await Promise.all(
            messages.map(async (msg) => {
                const sender = await storage.getUserById(msg.senderId);
                return {
                    ...msg,
                    senderName: sender?.name || "Unknown",
                    senderAvatar: sender?.avatar || "",
                    senderRole: sender?.role || "EMPLOYEE",
                };
            }),
        );

        res.json(enriched);
    } catch (err) {
        console.error("Get team chat error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/chat/team/:managerId — send a team group chat message
router.post("/team/:managerId", authenticateToken, async (req, res) => {
    try {
        const { managerId } = req.params;
        const parsed = sendMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid message", errors: parsed.error.issues });
        }

        // Verify user belongs to team
        const currentUser = await storage.getUserById(req.user!.id);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const isTeamMember =
            currentUser.id === managerId ||
            currentUser.managerId === managerId;

        if (!isTeamMember) {
            return res.status(403).json({ message: "You are not a member of this team" });
        }

        const message = await storage.createChatMessage({
            senderId: req.user!.id,
            teamManagerId: managerId,
            messageType: "team",
            content: parsed.data.content,
        });

        const sender = await storage.getUserById(req.user!.id);
        res.json({
            ...message,
            senderName: sender?.name || "Unknown",
            senderAvatar: sender?.avatar || "",
            senderRole: sender?.role || "EMPLOYEE",
        });
    } catch (err) {
        console.error("Send team chat error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/chat/private/:userId — get private DMs with a specific user
router.get("/private/:userId", authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { before, limit, managerId } = req.query;

        if (!managerId) {
            return res.status(400).json({ message: "managerId query param is required" });
        }

        const managerIdStr = typeof managerId === "string" ? managerId : Array.isArray(managerId) ? managerId[0] : "";
        const beforeStr = typeof before === "string" ? before : undefined;
        const messages = await storage.getPrivateMessages(
            req.user!.id,
            userId,
            managerIdStr,
            limit ? parseInt(limit as string) : 50,
            beforeStr,
        );

        // Enrich messages with sender info
        const enriched = await Promise.all(
            messages.map(async (msg) => {
                const sender = await storage.getUserById(msg.senderId);
                return {
                    ...msg,
                    senderName: sender?.name || "Unknown",
                    senderAvatar: sender?.avatar || "",
                    senderRole: sender?.role || "EMPLOYEE",
                };
            }),
        );

        res.json(enriched);
    } catch (err) {
        console.error("Get private chat error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/chat/private/:userId — send a private DM to a specific user
router.post("/private/:userId", authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { managerId } = req.body as { managerId?: string };
        const parsed = sendMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid message", errors: parsed.error.issues });
        }

        if (!managerId) {
            return res.status(400).json({ message: "managerId is required" });
        }

        const message = await storage.createChatMessage({
            senderId: req.user!.id,
            teamManagerId: managerId,
            recipientId: userId,
            messageType: "private",
            content: parsed.data.content,
        });

        const sender = await storage.getUserById(req.user!.id);
        res.json({
            ...message,
            senderName: sender?.name || "Unknown",
            senderAvatar: sender?.avatar || "",
            senderRole: sender?.role || "EMPLOYEE",
        });
    } catch (err) {
        console.error("Send private chat error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
