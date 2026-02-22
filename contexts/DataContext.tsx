import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from './AuthContext';

export type LeaveStatus = 'Draft' | 'Submitted' | 'Pending_Manager' | 'Pending_HR' | 'Approved' | 'Rejected' | 'Escalated';
export type LeaveType = 'Annual' | 'Sick' | 'Personal' | 'Maternity' | 'Paternity' | 'Bereavement';

export interface ApprovalEntry {
  approverId: string;
  approverName: string;
  action: 'approve' | 'reject' | 'escalate' | 'submit';
  comment: string;
  timestamp: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  managerId?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approvalHistory: ApprovalEntry[];
  createdAt: string;
  updatedAt: string;
}

export type TicketStatus = 'Open' | 'Assigned' | 'In_Progress' | 'Resolved' | 'Closed' | 'Escalated';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Access' | 'Other';

export interface TicketComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  comments: TicketComment[];
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseStatus = 'Draft' | 'Submitted' | 'Pending_Manager' | 'Pending_Finance' | 'Approved' | 'Rejected' | 'Paid';

export interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  receiptUri?: string;
  status: ExpenseStatus;
  submittedBy: string;
  submittedByName: string;
  approvalHistory: ApprovalEntry[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'action_required' | 'status_update' | 'announcement' | 'escalation';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface LeaveBalance {
  annual: number;
  sick: number;
  personal: number;
}

interface DataContextValue {
  leaves: LeaveRequest[];
  tickets: Ticket[];
  expenses: Expense[];
  notifications: Notification[];
  leaveBalance: LeaveBalance;
  createLeave: (leave: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt' | 'approvalHistory'>) => Promise<LeaveRequest>;
  updateLeaveStatus: (id: string, status: LeaveStatus, approverId: string, approverName: string, comment: string) => Promise<void>;
  createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'slaDeadline'>) => Promise<Ticket>;
  addTicketComment: (ticketId: string, comment: Omit<TicketComment, 'id' | 'createdAt'>) => Promise<void>;
  updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'approvalHistory'>) => Promise<Expense>;
  updateExpenseStatus: (id: string, status: ExpenseStatus, approverId: string, approverName: string, comment: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  unreadCount: number;
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({ annual: 15, sick: 8, personal: 3 });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [leavesData, ticketsData, expensesData, notificationsData, balanceData] = await Promise.all([
        apiClient.getLeaves().catch(() => []),
        apiClient.getTickets().catch(() => []),
        apiClient.getExpenses().catch(() => []),
        apiClient.getNotifications().catch(() => []),
        apiClient.getLeaveBalance().catch(() => ({ annual: 15, sick: 8, personal: 3 })),
      ]);

      setLeaves(leavesData);
      setTickets(ticketsData);
      setExpenses(expensesData);
      setNotifications(notificationsData);
      setLeaveBalance(balanceData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  const createLeave = useCallback(async (leave: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt' | 'approvalHistory'>) => {
    const newLeave = await apiClient.createLeave({
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason,
    });
    // Refresh leaves list
    const updatedLeaves = await apiClient.getLeaves().catch(() => leaves);
    setLeaves(updatedLeaves);
    return newLeave;
  }, [leaves]);

  const updateLeaveStatus = useCallback(async (id: string, status: LeaveStatus, approverId: string, approverName: string, comment: string) => {
    const action = status === 'Approved' ? 'approve' : status === 'Rejected' ? 'reject' : 'escalate';
    await apiClient.approveLeave(id, action, comment);
    // Refresh leaves list
    const updatedLeaves = await apiClient.getLeaves().catch(() => leaves);
    setLeaves(updatedLeaves);
  }, [leaves]);

  const createTicket = useCallback(async (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'slaDeadline'>) => {
    const newTicket = await apiClient.createTicket({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
    });
    const updatedTickets = await apiClient.getTickets().catch(() => tickets);
    setTickets(updatedTickets);
    return newTicket;
  }, [tickets]);

  const addTicketComment = useCallback(async (ticketId: string, comment: Omit<TicketComment, 'id' | 'createdAt'>) => {
    await apiClient.addTicketComment(ticketId, comment.content);
    const updatedTickets = await apiClient.getTickets().catch(() => tickets);
    setTickets(updatedTickets);
  }, [tickets]);

  const updateTicketStatus = useCallback(async (id: string, status: TicketStatus) => {
    await apiClient.updateTicketStatus(id, status);
    const updatedTickets = await apiClient.getTickets().catch(() => tickets);
    setTickets(updatedTickets);
  }, [tickets]);

  const createExpense = useCallback(async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'approvalHistory'>) => {
    const newExpense = await apiClient.createExpense({
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category,
    });
    const updatedExpenses = await apiClient.getExpenses().catch(() => expenses);
    setExpenses(updatedExpenses);
    return newExpense;
  }, [expenses]);

  const updateExpenseStatus = useCallback(async (id: string, status: ExpenseStatus, approverId: string, approverName: string, comment: string) => {
    const action = status === 'Approved' || status === 'Paid' ? 'approve' : 'reject';
    await apiClient.approveExpense(id, action, comment);
    const updatedExpenses = await apiClient.getExpenses().catch(() => expenses);
    setExpenses(updatedExpenses);
  }, [expenses]);

  const markNotificationRead = useCallback(async (id: string) => {
    await apiClient.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const addNotification = useCallback(async (_notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    // Notifications are created server-side. Just refresh.
    const updatedNotifications = await apiClient.getNotifications().catch(() => notifications);
    setNotifications(updatedNotifications);
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const value = useMemo(() => ({
    leaves, tickets, expenses, notifications, leaveBalance,
    createLeave, updateLeaveStatus,
    createTicket, addTicketComment, updateTicketStatus,
    createExpense, updateExpenseStatus,
    markNotificationRead, addNotification,
    unreadCount, refreshData: loadData, isLoading,
  }), [leaves, tickets, expenses, notifications, leaveBalance, createLeave, updateLeaveStatus, createTicket, addTicketComment, updateTicketStatus, createExpense, updateExpenseStatus, markNotificationRead, addNotification, unreadCount, loadData, isLoading]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
