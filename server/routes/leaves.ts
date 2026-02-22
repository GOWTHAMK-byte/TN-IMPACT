import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createLeaveSchema, approvalActionSchema } from "@shared/schema";
import * as storage from "../storage";

const router = Router();

// POST /api/leaves – create leave request
router.post("/", authenticateToken, validate(createLeaveSchema), async (req, res) => {
    try {
        const user = await storage.getUserById(req.user!.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const leave = await storage.createLeave({
            employeeId: req.user!.id,
            managerId: user.managerId || undefined,
            leaveType: req.body.leaveType,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            reason: req.body.reason,
            status: user.managerId ? "Pending_Manager" : "Pending_HR",
        });

        // Notify manager if exists
        if (user.managerId) {
            await storage.createNotification({
                userId: user.managerId,
                title: "Leave Request",
                body: `${user.name} has submitted a leave request`,
                type: "action_required",
                entityType: "leave",
                entityId: leave.id,
            });
        }

        await storage.createAuditLog({
            userId: req.user!.id,
            action: "create",
            entityType: "leave",
            entityId: leave.id,
            details: `Created ${req.body.leaveType} leave`,
        });

        res.status(201).json(leave);
    } catch (err) {
        console.error("Create leave error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/leaves
router.get("/", authenticateToken, async (req, res) => {
    try {
        const role = req.user!.role;
        let leaveList;

        if (role === "HR_ADMIN" || role === "SUPER_ADMIN") {
            leaveList = await storage.getLeaves({ all: true });
        } else if (role === "MANAGER") {
            leaveList = await storage.getLeaves({ managerId: req.user!.id });
        } else {
            leaveList = await storage.getLeaves({ employeeId: req.user!.id });
        }

        // Enrich with employee names
        const enriched = await Promise.all(
            leaveList.map(async (l) => {
                const employee = await storage.getUserById(l.employeeId);
                const approvals = await storage.getLeaveApprovals(l.id);
                const enrichedApprovals = await Promise.all(
                    approvals.map(async (a) => {
                        const approver = await storage.getUserById(a.approverId);
                        return {
                            ...a,
                            approverName: approver?.name || "Unknown",
                        };
                    })
                );
                return {
                    ...l,
                    employeeName: employee?.name || "Unknown",
                    approvalHistory: enrichedApprovals,
                };
            })
        );

        res.json(enriched);
    } catch (err) {
        console.error("Get leaves error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/leaves/balance
router.get("/balance", authenticateToken, async (req, res) => {
    try {
        const balance = await storage.getLeaveBalance(req.user!.id);
        res.json(balance);
    } catch (err) {
        console.error("Get leave balance error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/leaves/:id
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const leave = await storage.getLeaveById(req.params.id);
        if (!leave) return res.status(404).json({ message: "Leave not found" });

        const employee = await storage.getUserById(leave.employeeId);
        const approvals = await storage.getLeaveApprovals(leave.id);
        const enrichedApprovals = await Promise.all(
            approvals.map(async (a) => {
                const approver = await storage.getUserById(a.approverId);
                return { ...a, approverName: approver?.name || "Unknown" };
            })
        );

        res.json({
            ...leave,
            employeeName: employee?.name || "Unknown",
            approvalHistory: enrichedApprovals,
        });
    } catch (err) {
        console.error("Get leave error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// PATCH /api/leaves/:id/approve
router.patch(
    "/:id/approve",
    authenticateToken,
    requireRole("MANAGER", "HR_ADMIN"),
    validate(approvalActionSchema),
    async (req, res) => {
        try {
            const leave = await storage.getLeaveById(req.params.id);
            if (!leave) return res.status(404).json({ message: "Leave not found" });

            const { action, comment } = req.body;
            let newStatus: string;

            if (action === "approve") {
                newStatus = req.user!.role === "MANAGER" ? "Pending_HR" : "Approved";
                // If HR approving and it was Pending_HR, mark Approved
                if (leave.status === "Pending_HR" || req.user!.role === "HR_ADMIN") {
                    newStatus = "Approved";
                }
            } else if (action === "reject") {
                newStatus = "Rejected";
            } else {
                newStatus = "Escalated";
            }

            await storage.updateLeaveStatus(leave.id, newStatus, req.user!.id, action, comment);

            // Notify employee
            await storage.createNotification({
                userId: leave.employeeId,
                title: `Leave ${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Escalated"}`,
                body: `Your leave request has been ${action}d by ${req.user!.name}`,
                type: "status_update",
                entityType: "leave",
                entityId: leave.id,
            });

            await storage.createAuditLog({
                userId: req.user!.id,
                action,
                entityType: "leave",
                entityId: leave.id,
                details: comment || `Leave ${action}`,
            });

            res.json({ message: `Leave ${action}d successfully`, status: newStatus });
        } catch (err) {
            console.error("Approve leave error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

export default router;
