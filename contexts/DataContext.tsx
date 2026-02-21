import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

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

const STORAGE_KEYS = {
  leaves: 'servicehub_leaves',
  tickets: 'servicehub_tickets',
  expenses: 'servicehub_expenses',
  notifications: 'servicehub_notifications',
  leaveBalance: 'servicehub_leave_balance',
  seeded: 'servicehub_seeded',
};

function getSeedData() {
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  const leaves: LeaveRequest[] = [
    {
      id: 'l1', employeeId: 'u1', employeeName: 'Alex Rivera', managerId: 'u2',
      leaveType: 'Annual', startDate: '2026-03-10', endDate: '2026-03-14',
      reason: 'Family vacation', status: 'Pending_Manager',
      approvalHistory: [{ approverId: 'u1', approverName: 'Alex Rivera', action: 'submit', comment: 'Submitted for approval', timestamp: weekAgo }],
      createdAt: weekAgo, updatedAt: weekAgo,
    },
    {
      id: 'l2', employeeId: 'u1', employeeName: 'Alex Rivera', managerId: 'u2',
      leaveType: 'Sick', startDate: '2026-02-05', endDate: '2026-02-06',
      reason: 'Not feeling well', status: 'Approved',
      approvalHistory: [
        { approverId: 'u1', approverName: 'Alex Rivera', action: 'submit', comment: 'Submitted', timestamp: twoWeeksAgo },
        { approverId: 'u2', approverName: 'Sarah Chen', action: 'approve', comment: 'Get well soon', timestamp: weekAgo },
      ],
      createdAt: twoWeeksAgo, updatedAt: weekAgo,
    },
  ];

  const tickets: Ticket[] = [
    {
      id: 't1', title: 'VPN connection issues', description: 'Unable to connect to corporate VPN from home network',
      category: 'Network', priority: 'High', status: 'In_Progress',
      createdBy: 'u1', createdByName: 'Alex Rivera', assignedTo: 'u4', assignedToName: 'Priya Sharma',
      comments: [
        { id: 'tc1', authorId: 'u4', authorName: 'Priya Sharma', content: 'Looking into this. Can you try resetting your VPN client?', createdAt: weekAgo },
      ],
      slaDeadline: new Date(Date.now() + 24 * 3600000).toISOString(),
      createdAt: weekAgo, updatedAt: weekAgo,
    },
    {
      id: 't2', title: 'New laptop setup', description: 'Need new MacBook Pro setup for development work',
      category: 'Hardware', priority: 'Medium', status: 'Open',
      createdBy: 'u1', createdByName: 'Alex Rivera',
      comments: [],
      slaDeadline: new Date(Date.now() + 72 * 3600000).toISOString(),
      createdAt: now, updatedAt: now,
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'e1', title: 'Client dinner', description: 'Dinner with Acme Corp stakeholders',
      amount: 245.50, currency: 'USD', category: 'Meals & Entertainment',
      status: 'Pending_Manager', submittedBy: 'u1', submittedByName: 'Alex Rivera',
      approvalHistory: [{ approverId: 'u1', approverName: 'Alex Rivera', action: 'submit', comment: 'Business dinner', timestamp: weekAgo }],
      createdAt: weekAgo, updatedAt: weekAgo,
    },
    {
      id: 'e2', title: 'Conference travel', description: 'Flight and hotel for React Summit 2026',
      amount: 1850.00, currency: 'USD', category: 'Travel',
      status: 'Approved', submittedBy: 'u1', submittedByName: 'Alex Rivera',
      approvalHistory: [
        { approverId: 'u1', approverName: 'Alex Rivera', action: 'submit', comment: 'Annual conference', timestamp: twoWeeksAgo },
        { approverId: 'u2', approverName: 'Sarah Chen', action: 'approve', comment: 'Approved', timestamp: weekAgo },
      ],
      createdAt: twoWeeksAgo, updatedAt: weekAgo,
    },
  ];

  const notifications: Notification[] = [
    { id: 'n1', title: 'Leave Pending Approval', body: 'Your annual leave request is pending manager approval', type: 'status_update', entityType: 'leave', entityId: 'l1', isRead: false, createdAt: weekAgo },
    { id: 'n2', title: 'Ticket Update', body: 'Priya Sharma commented on your VPN ticket', type: 'status_update', entityType: 'ticket', entityId: 't1', isRead: false, createdAt: weekAgo },
    { id: 'n3', title: 'Expense Submitted', body: 'Your client dinner expense is pending approval', type: 'action_required', entityType: 'expense', entityId: 'e1', isRead: true, createdAt: weekAgo },
    { id: 'n4', title: 'Company Update', body: 'Office closed on March 1st for maintenance', type: 'announcement', isRead: false, createdAt: now },
  ];

  const leaveBalance: LeaveBalance = { annual: 15, sick: 8, personal: 3 };

  return { leaves, tickets, expenses, notifications, leaveBalance };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({ annual: 15, sick: 8, personal: 3 });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    const seeded = await AsyncStorage.getItem(STORAGE_KEYS.seeded);
    if (!seeded) {
      const seed = getSeedData();
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.leaves, JSON.stringify(seed.leaves)],
        [STORAGE_KEYS.tickets, JSON.stringify(seed.tickets)],
        [STORAGE_KEYS.expenses, JSON.stringify(seed.expenses)],
        [STORAGE_KEYS.notifications, JSON.stringify(seed.notifications)],
        [STORAGE_KEYS.leaveBalance, JSON.stringify(seed.leaveBalance)],
        [STORAGE_KEYS.seeded, 'true'],
      ]);
      setLeaves(seed.leaves);
      setTickets(seed.tickets);
      setExpenses(seed.expenses);
      setNotifications(seed.notifications);
      setLeaveBalance(seed.leaveBalance);
    } else {
      const [l, t, e, n, lb] = await AsyncStorage.multiGet([
        STORAGE_KEYS.leaves, STORAGE_KEYS.tickets, STORAGE_KEYS.expenses,
        STORAGE_KEYS.notifications, STORAGE_KEYS.leaveBalance,
      ]);
      setLeaves(l[1] ? JSON.parse(l[1]) : []);
      setTickets(t[1] ? JSON.parse(t[1]) : []);
      setExpenses(e[1] ? JSON.parse(e[1]) : []);
      setNotifications(n[1] ? JSON.parse(n[1]) : []);
      setLeaveBalance(lb[1] ? JSON.parse(lb[1]) : { annual: 15, sick: 8, personal: 3 });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const persist = useCallback(async (key: string, data: unknown) => {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }, []);

  const createLeave = useCallback(async (leave: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt' | 'approvalHistory'>) => {
    const now = new Date().toISOString();
    const newLeave: LeaveRequest = {
      ...leave,
      id: Crypto.randomUUID(),
      status: 'Submitted',
      approvalHistory: [{ approverId: leave.employeeId, approverName: leave.employeeName, action: 'submit', comment: 'Submitted for approval', timestamp: now }],
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newLeave, ...leaves];
    setLeaves(updated);
    await persist(STORAGE_KEYS.leaves, updated);
    return newLeave;
  }, [leaves, persist]);

  const updateLeaveStatus = useCallback(async (id: string, status: LeaveStatus, approverId: string, approverName: string, comment: string) => {
    const now = new Date().toISOString();
    const updated = leaves.map(l => {
      if (l.id !== id) return l;
      return {
        ...l,
        status,
        updatedAt: now,
        approvalHistory: [...l.approvalHistory, {
          approverId, approverName,
          action: status === 'Approved' ? 'approve' as const : status === 'Rejected' ? 'reject' as const : 'escalate' as const,
          comment, timestamp: now,
        }],
      };
    });
    setLeaves(updated);
    await persist(STORAGE_KEYS.leaves, updated);
  }, [leaves, persist]);

  const createTicket = useCallback(async (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'slaDeadline'>) => {
    const now = new Date().toISOString();
    const slaHours = ticket.priority === 'Critical' ? 4 : ticket.priority === 'High' ? 24 : ticket.priority === 'Medium' ? 48 : 72;
    const newTicket: Ticket = {
      ...ticket,
      id: Crypto.randomUUID(),
      comments: [],
      slaDeadline: new Date(Date.now() + slaHours * 3600000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newTicket, ...tickets];
    setTickets(updated);
    await persist(STORAGE_KEYS.tickets, updated);
    return newTicket;
  }, [tickets, persist]);

  const addTicketComment = useCallback(async (ticketId: string, comment: Omit<TicketComment, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const updated = tickets.map(t => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        updatedAt: now,
        comments: [...t.comments, { ...comment, id: Crypto.randomUUID(), createdAt: now }],
      };
    });
    setTickets(updated);
    await persist(STORAGE_KEYS.tickets, updated);
  }, [tickets, persist]);

  const updateTicketStatus = useCallback(async (id: string, status: TicketStatus) => {
    const updated = tickets.map(t => t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t);
    setTickets(updated);
    await persist(STORAGE_KEYS.tickets, updated);
  }, [tickets, persist]);

  const createExpense = useCallback(async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'approvalHistory'>) => {
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expense,
      id: Crypto.randomUUID(),
      approvalHistory: [{ approverId: expense.submittedBy, approverName: expense.submittedByName, action: 'submit', comment: 'Submitted', timestamp: now }],
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    await persist(STORAGE_KEYS.expenses, updated);
    return newExpense;
  }, [expenses, persist]);

  const updateExpenseStatus = useCallback(async (id: string, status: ExpenseStatus, approverId: string, approverName: string, comment: string) => {
    const now = new Date().toISOString();
    const updated = expenses.map(e => {
      if (e.id !== id) return e;
      return {
        ...e,
        status,
        updatedAt: now,
        approvalHistory: [...e.approvalHistory, {
          approverId, approverName,
          action: status === 'Approved' || status === 'Paid' ? 'approve' as const : 'reject' as const,
          comment, timestamp: now,
        }],
      };
    });
    setExpenses(updated);
    await persist(STORAGE_KEYS.expenses, updated);
  }, [expenses, persist]);

  const markNotificationRead = useCallback(async (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setNotifications(updated);
    await persist(STORAGE_KEYS.notifications, updated);
  }, [notifications, persist]);

  const addNotification = useCallback(async (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotif: Notification = { ...notif, id: Crypto.randomUUID(), isRead: false, createdAt: new Date().toISOString() };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    await persist(STORAGE_KEYS.notifications, updated);
  }, [notifications, persist]);

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
