import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
// @ts-ignore - drizzle-zod types may not resolve in IDE but work at runtime
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "EMPLOYEE",
  "MANAGER",
  "HR_ADMIN",
  "IT_ADMIN",
  "FINANCE_ADMIN",
  "SUPER_ADMIN",
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "Draft",
  "Submitted",
  "Pending_Manager",
  "Pending_HR",
  "Approved",
  "Rejected",
  "Escalated",
]);

export const leaveTypeEnum = pgEnum("leave_type", [
  "Annual",
  "Sick",
  "Personal",
  "Maternity",
  "Paternity",
  "Bereavement",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "Open",
  "Assigned",
  "In_Progress",
  "Resolved",
  "Closed",
  "Escalated",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "Low",
  "Medium",
  "High",
  "Critical",
]);

export const ticketCategoryEnum = pgEnum("ticket_category", [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Other",
]);

export const expenseStatusEnum = pgEnum("expense_status", [
  "Draft",
  "Submitted",
  "Pending_Manager",
  "Pending_Finance",
  "Approved",
  "Rejected",
  "Paid",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "action_required",
  "status_update",
  "announcement",
  "escalation",
]);

// ── Tables ─────────────────────────────────────────────────────────────────

export const departments = pgTable("departments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("EMPLOYEE"),
  department: text("department").notNull().default("General"),
  title: text("title").default(""),
  phone: text("phone").default(""),
  avatar: text("avatar").default(""),
  managerId: varchar("manager_id").references((): any => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaveBalances = pgTable("leave_balances", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  annual: integer("annual").notNull().default(15),
  sick: integer("sick").notNull().default(8),
  personal: integer("personal").notNull().default(3),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaves = pgTable("leaves", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id")
    .notNull()
    .references(() => users.id),
  managerId: varchar("manager_id").references(() => users.id),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason").notNull(),
  status: leaveStatusEnum("status").notNull().default("Submitted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaveApprovals = pgTable("leave_approvals", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  leaveId: varchar("leave_id")
    .notNull()
    .references(() => leaves.id),
  approverId: varchar("approver_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(), // submit, approve, reject, escalate
  comment: text("comment").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: ticketCategoryEnum("category").notNull(),
  priority: ticketPriorityEnum("priority").notNull().default("Medium"),
  status: ticketStatusEnum("status").notNull().default("Open"),
  createdBy: varchar("created_by")
    .notNull()
    .references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  slaDeadline: timestamp("sla_deadline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ticketComments = pgTable("ticket_comments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id")
    .notNull()
    .references(() => tickets.id),
  authorId: varchar("author_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  category: text("category").notNull(),
  receiptUri: text("receipt_uri"),
  status: expenseStatusEnum("status").notNull().default("Submitted"),
  submittedBy: varchar("submitted_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const expenseApprovals = pgTable("expense_approvals", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id")
    .notNull()
    .references(() => expenses.id),
  approverId: varchar("approver_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(), // submit, approve, reject
  comment: text("comment").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: notificationTypeEnum("type").notNull().default("status_update"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Zod Schemas ────────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  name: true,
  role: true,
  department: true,
  title: true,
  phone: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createLeaveSchema = z.object({
  leaveType: z.enum(["Annual", "Sick", "Personal", "Maternity", "Paternity", "Bereavement"]),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
  reason: z.string().default(""),
});

export const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(["Hardware", "Software", "Network", "Access", "Other"]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
});

export const createExpenseSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  amount: z.coerce.number().positive(),
  currency: z.string().default("USD"),
  category: z.string().min(1),
});

export const approvalActionSchema = z.object({
  action: z.enum(["approve", "reject", "escalate"]),
  comment: z.string().default(""),
});

// ── Types ──────────────────────────────────────────────────────────────────

export type UserRole = "EMPLOYEE" | "MANAGER" | "HR_ADMIN" | "IT_ADMIN" | "FINANCE_ADMIN" | "SUPER_ADMIN";
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LeaveRequest = typeof leaves.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
