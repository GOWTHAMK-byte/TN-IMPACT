import { db } from "./db";
import {
  users, leaves, leaveApprovals, leaveBalances,
  tickets, ticketComments, expenses, expenseApprovals,
  notifications, auditLogs, refreshTokens,
} from "@shared/schema";
import type { UserRole } from "@shared/schema";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";

// ── Users ──────────────────────────────────────────────────────────────────

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user || null;
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user || null;
}

export async function getUsers(filters?: { department?: string; role?: UserRole; search?: string }) {
  let query = db.select().from(users).where(eq(users.isActive, true));

  if (filters?.department) {
    query = query.where(eq(users.department, filters.department)) as any;
  }
  if (filters?.role) {
    query = query.where(eq(users.role, filters.role)) as any;
  }

  const results = await query.orderBy(users.name);

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    return results.filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.department.toLowerCase().includes(s)
    );
  }
  return results;
}

export async function createUser(data: {
  username: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  department: string;
  title?: string;
  phone?: string;
  avatar?: string;
  managerId?: string;
}) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

// ── Refresh Tokens ─────────────────────────────────────────────────────────

export async function saveRefreshToken(userId: string, token: string, expiresAt: Date) {
  await db.insert(refreshTokens).values({ userId, token, expiresAt });
}

export async function getRefreshToken(token: string) {
  const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token)).limit(1);
  return row || null;
}

export async function deleteRefreshToken(token: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

export async function deleteUserRefreshTokens(userId: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

// ── Leave Balances ─────────────────────────────────────────────────────────

export async function getLeaveBalance(userId: string) {
  const [balance] = await db.select().from(leaveBalances).where(eq(leaveBalances.userId, userId)).limit(1);
  if (!balance) {
    // Create default balance
    const [newBalance] = await db.insert(leaveBalances).values({ userId }).returning();
    return newBalance;
  }
  return balance;
}

export async function updateLeaveBalance(userId: string, data: { annual?: number; sick?: number; personal?: number }) {
  await db
    .update(leaveBalances)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(leaveBalances.userId, userId));
}

// ── Leaves ─────────────────────────────────────────────────────────────────

export async function createLeave(data: {
  employeeId: string;
  managerId?: string;
  leaveType: any;
  startDate: string;
  endDate: string;
  reason: string;
  status?: any;
}) {
  const [leave] = await db
    .insert(leaves)
    .values({ ...data, status: data.status || "Submitted" })
    .returning();

  // Create initial approval entry
  await db.insert(leaveApprovals).values({
    leaveId: leave.id,
    approverId: data.employeeId,
    action: "submit",
    comment: "Submitted for approval",
  });

  return leave;
}

export async function getLeaves(filters: {
  employeeId?: string;
  managerId?: string;
  status?: string;
  all?: boolean;
}) {
  if (filters.all) {
    return db.select().from(leaves).orderBy(desc(leaves.createdAt));
  }
  if (filters.managerId) {
    return db.select().from(leaves).where(eq(leaves.managerId, filters.managerId)).orderBy(desc(leaves.createdAt));
  }
  if (filters.employeeId) {
    return db.select().from(leaves).where(eq(leaves.employeeId, filters.employeeId)).orderBy(desc(leaves.createdAt));
  }
  return db.select().from(leaves).orderBy(desc(leaves.createdAt));
}

export async function getLeaveById(id: string) {
  const [leave] = await db.select().from(leaves).where(eq(leaves.id, id)).limit(1);
  return leave || null;
}

export async function getLeaveApprovals(leaveId: string) {
  return db.select().from(leaveApprovals).where(eq(leaveApprovals.leaveId, leaveId)).orderBy(leaveApprovals.createdAt);
}

export async function updateLeaveStatus(id: string, status: any, approverId: string, action: string, comment: string) {
  await db.update(leaves).set({ status, updatedAt: new Date() }).where(eq(leaves.id, id));
  await db.insert(leaveApprovals).values({ leaveId: id, approverId, action, comment });
}

// ── Tickets ────────────────────────────────────────────────────────────────

export async function createTicket(data: {
  title: string;
  description: string;
  category: any;
  priority: any;
  createdBy: string;
  assignedTo?: string;
}) {
  const slaHours =
    data.priority === "Critical" ? 4 : data.priority === "High" ? 24 : data.priority === "Medium" ? 48 : 72;
  const slaDeadline = new Date(Date.now() + slaHours * 3600000);

  const [ticket] = await db.insert(tickets).values({ ...data, slaDeadline }).returning();
  return ticket;
}

export async function getTickets(filters: {
  createdBy?: string;
  assignedTo?: string;
  status?: string;
  all?: boolean;
}) {
  if (filters.all) {
    return db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }
  if (filters.assignedTo) {
    return db.select().from(tickets).where(eq(tickets.assignedTo, filters.assignedTo)).orderBy(desc(tickets.createdAt));
  }
  if (filters.createdBy) {
    return db.select().from(tickets).where(eq(tickets.createdBy, filters.createdBy)).orderBy(desc(tickets.createdAt));
  }
  return db.select().from(tickets).orderBy(desc(tickets.createdAt));
}

export async function getTicketById(id: string) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return ticket || null;
}

export async function getTicketComments(ticketId: string) {
  return db.select().from(ticketComments).where(eq(ticketComments.ticketId, ticketId)).orderBy(ticketComments.createdAt);
}

export async function addTicketComment(data: { ticketId: string; authorId: string; content: string }) {
  const [comment] = await db.insert(ticketComments).values(data).returning();
  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, data.ticketId));
  return comment;
}

export async function updateTicketStatus(id: string, status: any, assignedTo?: string) {
  const updates: any = { status, updatedAt: new Date() };
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  await db.update(tickets).set(updates).where(eq(tickets.id, id));
}

// ── Expenses ───────────────────────────────────────────────────────────────

export async function createExpense(data: {
  title: string;
  description: string;
  amount: string;
  currency: string;
  category: string;
  receiptUri?: string;
  submittedBy: string;
  status?: any;
}) {
  const [expense] = await db
    .insert(expenses)
    .values({ ...data, status: data.status || "Submitted" })
    .returning();

  await db.insert(expenseApprovals).values({
    expenseId: expense.id,
    approverId: data.submittedBy,
    action: "submit",
    comment: "Submitted",
  });

  return expense;
}

export async function getExpenses(filters: {
  submittedBy?: string;
  all?: boolean;
}) {
  if (filters.all) {
    return db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }
  if (filters.submittedBy) {
    return db
      .select()
      .from(expenses)
      .where(eq(expenses.submittedBy, filters.submittedBy))
      .orderBy(desc(expenses.createdAt));
  }
  return db.select().from(expenses).orderBy(desc(expenses.createdAt));
}

export async function getExpenseById(id: string) {
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return expense || null;
}

export async function getExpenseApprovals(expenseId: string) {
  return db.select().from(expenseApprovals).where(eq(expenseApprovals.expenseId, expenseId)).orderBy(expenseApprovals.createdAt);
}

export async function updateExpenseStatus(id: string, status: any, approverId: string, action: string, comment: string) {
  await db.update(expenses).set({ status, updatedAt: new Date() }).where(eq(expenses.id, id));
  await db.insert(expenseApprovals).values({ expenseId: id, approverId, action, comment });
}

// ── Notifications ──────────────────────────────────────────────────────────

export async function createNotification(data: {
  userId: string;
  title: string;
  body: string;
  type: any;
  entityType?: string;
  entityId?: string;
}) {
  const [notification] = await db.insert(notifications).values(data).returning();
  return notification;
}

export async function getNotifications(userId: string) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(id: string, userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result[0]?.count || 0);
}

// ── Audit Logs ─────────────────────────────────────────────────────────────

export async function createAuditLog(data: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}) {
  await db.insert(auditLogs).values(data);
}

// ── Search ─────────────────────────────────────────────────────────────────

export async function searchAll(query: string) {
  const q = `%${query}%`;
  const [userResults, ticketResults, leaveResults] = await Promise.all([
    db.select().from(users).where(
      or(ilike(users.name, q), ilike(users.email, q), ilike(users.department, q))
    ).limit(10),
    db.select().from(tickets).where(
      or(ilike(tickets.title, q), ilike(tickets.description, q))
    ).limit(10),
    db.select().from(leaves).where(
      or(ilike(leaves.reason, q), ilike(leaves.leaveType, q))
    ).limit(10),
  ]);
  return { users: userResults, tickets: ticketResults, leaves: leaveResults };
}
