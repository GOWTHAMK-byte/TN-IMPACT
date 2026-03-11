import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from './AuthContext';
import { Project } from '@shared/schema';

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
  projectId?: string;
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
  projectId?: string;
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
  projectId?: string;
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

export type TodoPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TodoCategory = 'Work' | 'Personal' | 'Meeting' | 'Deadline' | 'Other';

export interface TodoItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  priority: TodoPriority;
  category: TodoCategory;
  isCompleted: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
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
  projects: Project[];
  createProject: (data: { name: string; description?: string; managerId?: string }) => Promise<Project>;
  updateProject: (id: string, data: { name?: string; description?: string; managerId?: string }) => Promise<void>;
  todos: TodoItem[];
  createTodo: (data: { title: string; description?: string; priority?: string; category?: string; dueDate?: string }) => Promise<TodoItem>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  refreshTodos: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({ annual: 15, sick: 8, personal: 3 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [leavesData, ticketsData, expensesData, notificationsData, balanceData, projectsData, todosData] = await Promise.all([
        apiClient.getLeaves().catch(() => []),
        apiClient.getTickets().catch(() => []),
        apiClient.getExpenses().catch(() => []),
        apiClient.getNotifications().catch(() => []),
        apiClient.getLeaveBalance().catch(() => ({ annual: 15, sick: 8, personal: 3 })),
        apiClient.getProjects().catch(() => []),
        apiClient.getTodos().catch(() => []),
      ]);

      setLeaves(leavesData);
      setTickets(ticketsData);
      setExpenses(expensesData);
      setNotifications(notificationsData);
      setLeaveBalance(balanceData);
      setProjects(projectsData);
      setTodos(todosData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll for new notifications every 30 seconds
  const notifPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    const pollNotifications = async () => {
      try {
        const updated = await apiClient.getNotifications();
        setNotifications(updated);
      } catch { /* silently ignore */ }
    };
    notifPollRef.current = setInterval(pollNotifications, 30000);
    return () => {
      if (notifPollRef.current) clearInterval(notifPollRef.current);
    };
  }, [isAuthenticated]);


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

  const refreshProjects = useCallback(async () => {
    const updatedProjects = await apiClient.getProjects().catch(() => projects);
    setProjects(updatedProjects);
  }, [projects]);

  const createProject = useCallback(async (data: { name: string; description?: string; managerId?: string }) => {
    const newProject = await apiClient.createProject(data);
    refreshProjects();
    return newProject;
  }, [refreshProjects]);

  const updateProject = useCallback(async (id: string, data: { name?: string; description?: string; managerId?: string }) => {
    await apiClient.updateProject(id, data);
    refreshProjects();
  }, [refreshProjects]);

  const refreshTodos = useCallback(async () => {
    const updatedTodos = await apiClient.getTodos().catch(() => todos);
    setTodos(updatedTodos);
  }, [todos]);

  const createTodo = useCallback(async (data: { title: string; description?: string; priority?: string; category?: string; dueDate?: string }) => {
    const newTodo = await apiClient.createTodo(data);
    await refreshTodos();
    return newTodo;
  }, [refreshTodos]);

  const toggleTodo = useCallback(async (id: string) => {
    await apiClient.toggleTodo(id);
    setTodos(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    await apiClient.deleteTodo(id);
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const value = useMemo(() => ({
    leaves, tickets, expenses, notifications, leaveBalance, projects, todos,
    createLeave, updateLeaveStatus,
    createTicket, addTicketComment, updateTicketStatus,
    createExpense, updateExpenseStatus,
    createProject, updateProject,
    createTodo, toggleTodo, deleteTodo, refreshTodos,
    markNotificationRead, addNotification,
    unreadCount, refreshData: loadData, isLoading,
  }), [leaves, tickets, expenses, notifications, leaveBalance, projects, todos, createLeave, updateLeaveStatus, createTicket, addTicketComment, updateTicketStatus, createExpense, updateExpenseStatus, createProject, updateProject, createTodo, toggleTodo, deleteTodo, refreshTodos, markNotificationRead, addNotification, unreadCount, loadData, isLoading]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
