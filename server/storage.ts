import { db } from "./db";
import {
  users, leaves, leaveApprovals, leaveBalances,
  tickets, ticketComments, expenses, expenseApprovals,
  notifications, auditLogs, refreshTokens, projects, todos,
  chatMessages,
} from "@shared/schema";
import type { UserRole, Project } from "@shared/schema";
import { eq, and, or, ilike, desc, asc, sql, inArray, lt } from "drizzle-orm";

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
  const conditions = [eq(users.isActive, true)];

  if (filters?.department) {
    conditions.push(eq(users.department, filters.department));
  }
  if (filters?.role) {
    conditions.push(eq(users.role, filters.role));
  }

  const results = await db.select().from(users).where(and(...conditions)).orderBy(users.name);

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
  passwordHash?: string;
  name: string;
  role: UserRole;
  department: string;
  title?: string;
  phone?: string;
  avatar?: string;
  managerId?: string;
  projectId?: string;
}) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function updateUser(id: string, data: Partial<typeof users.$inferInsert>) {
  const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
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
  projectId?: string;
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
    // A manager can see leaves where they are the direct manager OR where they manage the project the leaf belongs to
    const managedProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.managerId, filters.managerId));
    const projectIds = managedProjects.map(p => p.id);

    return db.select().from(leaves)
      .where(or(
        eq(leaves.managerId, filters.managerId),
        projectIds.length > 0 ? inArray(leaves.projectId, projectIds) : sql`false`
      ))
      .orderBy(desc(leaves.createdAt));
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
  projectId?: string;
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
  managerId?: string;
  status?: string;
  all?: boolean;
}) {
  if (filters.all) {
    return db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }
  if (filters.managerId) {
    const managedProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.managerId, filters.managerId));
    const projectIds = managedProjects.map(p => p.id);
    if (projectIds.length > 0) {
      return db.select().from(tickets).where(inArray(tickets.projectId, projectIds)).orderBy(desc(tickets.createdAt));
    } else {
      return [];
    }
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
  projectId?: string;
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
  managerId?: string;
  all?: boolean;
}) {
  if (filters.all) {
    return db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }
  if (filters.managerId) {
    const managedProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.managerId, filters.managerId));
    const projectIds = managedProjects.map(p => p.id);

    return db.select().from(expenses)
      .where(or(
        projectIds.length > 0 ? inArray(expenses.projectId, projectIds) : sql`false`,
        // Fallback for expenses submitted by direct reports before projects existed
        inArray(expenses.submittedBy, db.select({ id: users.id }).from(users).where(eq(users.managerId, filters.managerId)))
      ))
      .orderBy(desc(expenses.createdAt));
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

// ── Projects ───────────────────────────────────────────────────────────────

export async function createProject(data: { name: string; description?: string; managerId?: string }) {
  const [project] = await db.insert(projects).values(data).returning();
  return project;
}

export async function getProjects() {
  return db.select().from(projects).orderBy(projects.name);
}

export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project || null;
}

export async function updateProject(id: string, data: Partial<{ name: string; description: string; managerId: string }>) {
  const [project] = await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
  return project;
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

// ── Todos ──────────────────────────────────────────────────────────────────

export async function createTodo(data: {
  userId: string;
  title: string;
  description?: string;
  priority?: any;
  category?: any;
  dueDate?: string;
}) {
  const [todo] = await db.insert(todos).values(data).returning();
  return todo;
}

export async function getTodos(userId: string) {
  return db.select().from(todos).orderBy(desc(todos.createdAt));
}

export async function getTodoById(id: string) {
  const [todo] = await db.select().from(todos).where(eq(todos.id, id)).limit(1);
  return todo || null;
}

export async function updateTodo(id: string, data: Partial<typeof todos.$inferInsert>) {
  const [todo] = await db.update(todos).set({ ...data, updatedAt: new Date() }).where(eq(todos.id, id)).returning();
  return todo;
}

export async function deleteTodo(id: string) {
  await db.delete(todos).where(eq(todos.id, id));
}

export async function getTodosNeedingReminder() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  // Find todos that have a due date within the next hour, aren't completed, and haven't been reminded
  const allTodos = await db.select().from(todos).where(
    and(
      eq(todos.isCompleted, false),
      eq(todos.reminderSent, false),
    )
  );
  return allTodos.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due > now && due <= oneHourFromNow;
  });
}

export async function markReminderSent(id: string) {
  await db.update(todos).set({ reminderSent: true }).where(eq(todos.id, id));
}


// ── Team Management ────────────────────────────────────────────────────────

export async function getTeamMembers(managerId: string) {
  return db
    .select()
    .from(users)
    .where(and(eq(users.managerId, managerId), eq(users.isActive, true)))
    .orderBy(users.name);
}

export async function addTeamMember(managerId: string, employeeId: string) {
  const [user] = await db
    .update(users)
    .set({ managerId, updatedAt: new Date() })
    .where(eq(users.id, employeeId))
    .returning();
  return user;
}

export async function removeTeamMember(employeeId: string) {
  const [user] = await db
    .update(users)
    .set({ managerId: null, updatedAt: new Date() })
    .where(eq(users.id, employeeId))
    .returning();
  return user;
}

// ── Chat Messages ──────────────────────────────────────────────────────────

export async function getTeamChatMessages(teamManagerId: string, limit = 50, before?: string) {
  const conditions = [
    eq(chatMessages.teamManagerId, teamManagerId),
    eq(chatMessages.messageType, "team"),
  ];
  if (before) {
    conditions.push(lt(chatMessages.createdAt, new Date(before)));
  }
  return db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function getPrivateMessages(userA: string, userB: string, teamManagerId: string, limit = 50, before?: string) {
  const conditions = [
    eq(chatMessages.messageType, "private"),
    eq(chatMessages.teamManagerId, teamManagerId),
    or(
      and(eq(chatMessages.senderId, userA), eq(chatMessages.recipientId, userB)),
      and(eq(chatMessages.senderId, userB), eq(chatMessages.recipientId, userA)),
    ),
  ];
  if (before) {
    conditions.push(lt(chatMessages.createdAt, new Date(before)));
  }
  return db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function createChatMessage(data: {
  senderId: string;
  teamManagerId: string;
  recipientId?: string | null;
  messageType: "team" | "private";
  content: string;
}) {
  const [message] = await db.insert(chatMessages).values(data).returning();
  return message;
}

export async function getPrivateChatPartners(userId: string, teamManagerId: string) {
  // Get distinct user IDs that have private messages with this user in this team
  const sent = await db
    .select({ id: chatMessages.recipientId })
    .from(chatMessages)
    .where(and(
      eq(chatMessages.senderId, userId),
      eq(chatMessages.teamManagerId, teamManagerId),
      eq(chatMessages.messageType, "private"),
    ))
    .groupBy(chatMessages.recipientId);

  const received = await db
    .select({ id: chatMessages.senderId })
    .from(chatMessages)
    .where(and(
      eq(chatMessages.recipientId, userId),
      eq(chatMessages.teamManagerId, teamManagerId),
      eq(chatMessages.messageType, "private"),
    ))
    .groupBy(chatMessages.senderId);

  const ids = new Set([...sent.map(r => r.id), ...received.map(r => r.id)].filter(Boolean) as string[]);
  if (ids.size === 0) return [];

  return db.select().from(users).where(inArray(users.id, [...ids]));
}
