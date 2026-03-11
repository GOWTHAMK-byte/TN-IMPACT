import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createTodoSchema } from "@shared/schema";
import * as storage from "../storage";

const router = Router();

router.use(authenticateToken);

router.get("/", async (req: Request, res: Response) => {
    try {
        res.set("Cache-Control", "no-store");
        const todoList = await storage.getTodos(req.user!.id);
        res.json(todoList);
    } catch (err) {
        console.error("Get todos error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/", validate(createTodoSchema), async (req: Request, res: Response) => {
    try {
        const todo = await storage.createTodo({
            userId: req.user!.id,
            title: req.body.title,
            description: req.body.description || "",
            priority: req.body.priority || "Medium",
            category: req.body.category || "Work",
            dueDate: req.body.dueDate || undefined,
        });
        res.status(201).json(todo);
    } catch (err) {
        console.error("Create todo error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.patch("/:id", async (req: Request, res: Response) => {
    try {
        const todo = await storage.getTodoById(req.params.id);
        if (!todo) return res.status(404).json({ message: "Todo not found" });

        const { title, description, priority, category, dueDate, isCompleted } = req.body;
        const updated = await storage.updateTodo(req.params.id as string, {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(priority !== undefined && { priority }),
            ...(category !== undefined && { category }),
            ...(dueDate !== undefined && { dueDate: dueDate || null }),
            ...(isCompleted !== undefined && { isCompleted }),
        });
        res.json(updated);
    } catch (err) {
        console.error("Update todo error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.patch("/:id/toggle", async (req: Request, res: Response) => {
    try {
        const todo = await storage.getTodoById(req.params.id);
        if (!todo) return res.status(404).json({ message: "Todo not found" });


        const updated = await storage.updateTodo(req.params.id, {
            isCompleted: !todo.isCompleted,
        });
        res.json(updated);
    } catch (err) {
        console.error("Toggle todo error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const todo = await storage.getTodoById(req.params.id);
        if (!todo) return res.status(404).json({ message: "Todo not found" });


        await storage.deleteTodo(req.params.id);
        res.json({ message: "Todo deleted" });
    } catch (err) {
        console.error("Delete todo error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
