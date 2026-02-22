import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import * as storage from "../storage";

const router = Router();

// GET /api/search?q=query
router.get("/", authenticateToken, async (req, res) => {
    try {
        const query = req.query.q as string;
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: "Search query must be at least 2 characters" });
        }

        const results = await storage.searchAll(query.trim());

        // Strip passwordHash from user results
        const safeUsers = results.users.map(({ passwordHash, ...u }) => u);

        res.json({
            users: safeUsers,
            tickets: results.tickets,
            leaves: results.leaves,
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
