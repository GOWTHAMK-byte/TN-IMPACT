import * as bcrypt from "bcryptjs";
import { db } from "./db";
import {
    users,
    departments,
    leaves,
    leaveApprovals,
    leaveBalances,
    tickets,
    ticketComments,
    expenses,
    expenseApprovals,
    notifications,
} from "@shared/schema";

const DEFAULT_PASSWORD = "password123";

async function seed() {
    console.log("🌱 Starting database seed...\n");

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // ── Departments ──────────────────────────────────────────────────────────
    console.log("Creating departments...");
    await db.insert(departments).values([
        { id: "d1", name: "Engineering", description: "Software Engineering" },
        { id: "d2", name: "Human Resources", description: "HR Operations" },
        { id: "d3", name: "IT", description: "IT Support & Infrastructure" },
        { id: "d4", name: "Finance", description: "Finance & Accounting" },
        { id: "d5", name: "Executive", description: "Executive Leadership" },
    ]).onConflictDoNothing();

    // ── Users ────────────────────────────────────────────────────────────────
    console.log("Creating users...");
    const usersData = [
        {
            id: "u1",
            username: "alex.rivera",
            email: "alex.rivera@company.com",
            passwordHash,
            name: "Alex Rivera",
            role: "EMPLOYEE" as const,
            department: "Engineering",
            title: "Software Engineer",
            phone: "+1 (555) 123-4567",
            avatar: "AR",
            managerId: "u2",
        },
        {
            id: "u2",
            username: "sarah.chen",
            email: "sarah.chen@company.com",
            passwordHash,
            name: "Sarah Chen",
            role: "MANAGER" as const,
            department: "Engineering",
            title: "Engineering Manager",
            phone: "+1 (555) 234-5678",
            avatar: "SC",
        },
        {
            id: "u3",
            username: "michael.torres",
            email: "michael.torres@company.com",
            passwordHash,
            name: "Michael Torres",
            role: "HR_ADMIN" as const,
            department: "Human Resources",
            title: "HR Director",
            phone: "+1 (555) 345-6789",
            avatar: "MT",
        },
        {
            id: "u4",
            username: "priya.sharma",
            email: "priya.sharma@company.com",
            passwordHash,
            name: "Priya Sharma",
            role: "IT_ADMIN" as const,
            department: "IT",
            title: "IT Administrator",
            phone: "+1 (555) 456-7890",
            avatar: "PS",
        },
        {
            id: "u5",
            username: "david.kim",
            email: "david.kim@company.com",
            passwordHash,
            name: "David Kim",
            role: "FINANCE_ADMIN" as const,
            department: "Finance",
            title: "Finance Manager",
            phone: "+1 (555) 567-8901",
            avatar: "DK",
        },
        {
            id: "u6",
            username: "emma.wilson",
            email: "emma.wilson@company.com",
            passwordHash,
            name: "Emma Wilson",
            role: "SUPER_ADMIN" as const,
            department: "Executive",
            title: "Chief Operations Officer",
            phone: "+1 (555) 678-9012",
            avatar: "EW",
        },
    ];

    // Insert all users WITHOUT managerId first to avoid FK constraint
    for (const user of usersData) {
        const { managerId, ...userWithoutManager } = user;
        await db.insert(users).values(userWithoutManager).onConflictDoNothing();
    }

    // Now update manager references
    const { eq } = await import("drizzle-orm");
    for (const user of usersData) {
        if (user.managerId) {
            await db.update(users).set({ managerId: user.managerId }).where(eq(users.id, user.id));
        }
    }

    // ── Leave Balances ───────────────────────────────────────────────────────
    console.log("Creating leave balances...");
    for (const user of usersData) {
        await db.insert(leaveBalances).values({
            userId: user.id,
            annual: 15,
            sick: 8,
            personal: 3,
        }).onConflictDoNothing();
    }

    // ── Leaves ───────────────────────────────────────────────────────────────
    console.log("Creating sample leaves...");
    await db.insert(leaves).values([
        {
            id: "l1",
            employeeId: "u1",
            managerId: "u2",
            leaveType: "Annual",
            startDate: "2026-03-10",
            endDate: "2026-03-14",
            reason: "Family vacation",
            status: "Pending_Manager",
        },
        {
            id: "l2",
            employeeId: "u1",
            managerId: "u2",
            leaveType: "Sick",
            startDate: "2026-02-05",
            endDate: "2026-02-06",
            reason: "Not feeling well",
            status: "Approved",
        },
    ]).onConflictDoNothing();

    await db.insert(leaveApprovals).values([
        { leaveId: "l1", approverId: "u1", action: "submit", comment: "Submitted for approval" },
        { leaveId: "l2", approverId: "u1", action: "submit", comment: "Submitted" },
        { leaveId: "l2", approverId: "u2", action: "approve", comment: "Get well soon" },
    ]).onConflictDoNothing();

    // ── Tickets ──────────────────────────────────────────────────────────────
    console.log("Creating sample tickets...");
    await db.insert(tickets).values([
        {
            id: "t1",
            title: "VPN connection issues",
            description: "Unable to connect to corporate VPN from home network",
            category: "Network",
            priority: "High",
            status: "In_Progress",
            createdBy: "u1",
            assignedTo: "u4",
            slaDeadline: new Date(Date.now() + 24 * 3600000),
        },
        {
            id: "t2",
            title: "New laptop setup",
            description: "Need new MacBook Pro setup for development work",
            category: "Hardware",
            priority: "Medium",
            status: "Open",
            createdBy: "u1",
            slaDeadline: new Date(Date.now() + 72 * 3600000),
        },
    ]).onConflictDoNothing();

    await db.insert(ticketComments).values([
        {
            ticketId: "t1",
            authorId: "u4",
            content: "Looking into this. Can you try resetting your VPN client?",
        },
    ]).onConflictDoNothing();

    // ── Expenses ─────────────────────────────────────────────────────────────
    console.log("Creating sample expenses...");
    await db.insert(expenses).values([
        {
            id: "e1",
            title: "Client dinner",
            description: "Dinner with Acme Corp stakeholders",
            amount: "245.50",
            currency: "USD",
            category: "Meals & Entertainment",
            status: "Pending_Manager",
            submittedBy: "u1",
        },
        {
            id: "e2",
            title: "Conference travel",
            description: "Flight and hotel for React Summit 2026",
            amount: "1850.00",
            currency: "USD",
            category: "Travel",
            status: "Approved",
            submittedBy: "u1",
        },
    ]).onConflictDoNothing();

    await db.insert(expenseApprovals).values([
        { expenseId: "e1", approverId: "u1", action: "submit", comment: "Business dinner" },
        { expenseId: "e2", approverId: "u1", action: "submit", comment: "Annual conference" },
        { expenseId: "e2", approverId: "u2", action: "approve", comment: "Approved" },
    ]).onConflictDoNothing();

    // ── Notifications ────────────────────────────────────────────────────────
    console.log("Creating sample notifications...");
    await db.insert(notifications).values([
        {
            userId: "u1",
            title: "Leave Pending Approval",
            body: "Your annual leave request is pending manager approval",
            type: "status_update",
            entityType: "leave",
            entityId: "l1",
            isRead: false,
        },
        {
            userId: "u1",
            title: "Ticket Update",
            body: "Priya Sharma commented on your VPN ticket",
            type: "status_update",
            entityType: "ticket",
            entityId: "t1",
            isRead: false,
        },
        {
            userId: "u1",
            title: "Expense Submitted",
            body: "Your client dinner expense is pending approval",
            type: "action_required",
            entityType: "expense",
            entityId: "e1",
            isRead: true,
        },
        {
            userId: "u1",
            title: "Company Update",
            body: "Office closed on March 1st for maintenance",
            type: "announcement",
            isRead: false,
        },
        {
            userId: "u2",
            title: "Leave Request",
            body: "Alex Rivera has submitted a leave request for your approval",
            type: "action_required",
            entityType: "leave",
            entityId: "l1",
            isRead: false,
        },
        {
            userId: "u2",
            title: "Expense Submitted",
            body: "Alex Rivera submitted an expense for your approval",
            type: "action_required",
            entityType: "expense",
            entityId: "e1",
            isRead: false,
        },
    ]).onConflictDoNothing();

    console.log("\n✅ Database seeded successfully!");
    console.log("\n📋 Demo accounts (all use password: password123):");
    console.log("  Employee:      alex.rivera@company.com");
    console.log("  Manager:       sarah.chen@company.com");
    console.log("  HR Admin:      michael.torres@company.com");
    console.log("  IT Admin:      priya.sharma@company.com");
    console.log("  Finance Admin: david.kim@company.com");
    console.log("  Super Admin:   emma.wilson@company.com");

    process.exit(0);
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
