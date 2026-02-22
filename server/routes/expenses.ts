import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createExpenseSchema, approvalActionSchema } from "@shared/schema";
import * as storage from "../storage";

const router = Router();

// POST /api/expenses
router.post("/", authenticateToken, validate(createExpenseSchema), async (req, res) => {
    try {
        const expense = await storage.createExpense({
            ...req.body,
            amount: req.body.amount.toString(),
            submittedBy: req.user!.id,
            status: "Pending_Manager",
        });

        // Get user to find manager
        const user = await storage.getUserById(req.user!.id);
        if (user?.managerId) {
            await storage.createNotification({
                userId: user.managerId,
                title: "Expense Submitted",
                body: `${user.name} submitted an expense: ${req.body.title}`,
                type: "action_required",
                entityType: "expense",
                entityId: expense.id,
            });
        }

        await storage.createAuditLog({
            userId: req.user!.id,
            action: "create",
            entityType: "expense",
            entityId: expense.id,
            details: `Created expense: ${req.body.title} ($${req.body.amount})`,
        });

        res.status(201).json(expense);
    } catch (err) {
        console.error("Create expense error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/expenses
router.get("/", authenticateToken, async (req, res) => {
    try {
        const role = req.user!.role;
        let expenseList;

        if (role === "FINANCE_ADMIN" || role === "MANAGER" || role === "SUPER_ADMIN") {
            expenseList = await storage.getExpenses({ all: true });
        } else {
            expenseList = await storage.getExpenses({ submittedBy: req.user!.id });
        }

        // Enrich with user names and approval history
        const enriched = await Promise.all(
            expenseList.map(async (e) => {
                const submitter = await storage.getUserById(e.submittedBy);
                const approvals = await storage.getExpenseApprovals(e.id);
                const enrichedApprovals = await Promise.all(
                    approvals.map(async (a) => {
                        const approver = await storage.getUserById(a.approverId);
                        return { ...a, approverName: approver?.name || "Unknown" };
                    })
                );
                return {
                    ...e,
                    amount: parseFloat(e.amount),
                    submittedByName: submitter?.name || "Unknown",
                    approvalHistory: enrichedApprovals,
                };
            })
        );

        res.json(enriched);
    } catch (err) {
        console.error("Get expenses error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// PATCH /api/expenses/:id/approve
router.patch(
    "/:id/approve",
    authenticateToken,
    requireRole("MANAGER", "FINANCE_ADMIN"),
    validate(approvalActionSchema),
    async (req, res) => {
        try {
            const expense = await storage.getExpenseById(req.params.id);
            if (!expense) return res.status(404).json({ message: "Expense not found" });

            const { action, comment } = req.body;
            let newStatus: string;

            if (action === "approve") {
                if (req.user!.role === "MANAGER") {
                    newStatus = "Pending_Finance";
                } else {
                    newStatus = "Approved";
                }
                if (expense.status === "Pending_Finance" || req.user!.role === "FINANCE_ADMIN") {
                    newStatus = "Approved";
                }
            } else {
                newStatus = "Rejected";
            }

            await storage.updateExpenseStatus(expense.id, newStatus, req.user!.id, action, comment);

            await storage.createNotification({
                userId: expense.submittedBy,
                title: `Expense ${action === "approve" ? "Approved" : "Rejected"}`,
                body: `Your expense "${expense.title}" has been ${action}d by ${req.user!.name}`,
                type: "status_update",
                entityType: "expense",
                entityId: expense.id,
            });

            await storage.createAuditLog({
                userId: req.user!.id,
                action,
                entityType: "expense",
                entityId: expense.id,
                details: comment || `Expense ${action}`,
            });

            res.json({ message: `Expense ${action}d successfully`, status: newStatus });
        } catch (err) {
            console.error("Approve expense error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

export default router;
