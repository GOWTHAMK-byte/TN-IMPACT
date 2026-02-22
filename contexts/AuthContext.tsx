import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { apiClient, setAccessToken, setRefreshToken, clearTokens, getAccessToken } from '@/lib/api';

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'IT_ADMIN' | 'FINANCE_ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar: string;
  title: string;
  phone: string;
  managerId?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Demo credentials map for quick role-based login
const ROLE_EMAILS: Record<UserRole, string> = {
  EMPLOYEE: 'alex.rivera@company.com',
  MANAGER: 'sarah.chen@company.com',
  HR_ADMIN: 'michael.torres@company.com',
  IT_ADMIN: 'priya.sharma@company.com',
  FINANCE_ADMIN: 'david.kim@company.com',
  SUPER_ADMIN: 'emma.wilson@company.com',
};

const DEMO_PASSWORD = 'password123';

export const ALL_USERS: User[] = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex.rivera@company.com', role: 'EMPLOYEE', department: 'Engineering', avatar: 'AR', title: 'Software Engineer', phone: '+1 (555) 123-4567', managerId: 'u2' },
  { id: 'u2', name: 'Sarah Chen', email: 'sarah.chen@company.com', role: 'MANAGER', department: 'Engineering', avatar: 'SC', title: 'Engineering Manager', phone: '+1 (555) 234-5678' },
  { id: 'u3', name: 'Michael Torres', email: 'michael.torres@company.com', role: 'HR_ADMIN', department: 'Human Resources', avatar: 'MT', title: 'HR Director', phone: '+1 (555) 345-6789' },
  { id: 'u4', name: 'Priya Sharma', email: 'priya.sharma@company.com', role: 'IT_ADMIN', department: 'IT', avatar: 'PS', title: 'IT Administrator', phone: '+1 (555) 456-7890' },
  { id: 'u5', name: 'David Kim', email: 'david.kim@company.com', role: 'FINANCE_ADMIN', department: 'Finance', avatar: 'DK', title: 'Finance Manager', phone: '+1 (555) 567-8901' },
  { id: 'u6', name: 'Emma Wilson', email: 'emma.wilson@company.com', role: 'SUPER_ADMIN', department: 'Executive', avatar: 'EW', title: 'Chief Operations Officer', phone: '+1 (555) 678-9012' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if we have a valid token and restore session
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const me = await apiClient.getMe();
          setUser({
            id: me.id,
            name: me.name,
            email: me.email,
            role: me.role,
            department: me.department,
            avatar: me.avatar || me.name.substring(0, 2).toUpperCase(),
            title: me.title || '',
            phone: me.phone || '',
            managerId: me.managerId,
          });
        }
      } catch {
        // Token invalid or expired, clear it
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (_email: string, role: UserRole) => {
    // Use role to determine which demo account to log in as
    const email = ROLE_EMAILS[role];
    const password = DEMO_PASSWORD;

    try {
      const response = await apiClient.login(email, password);

      await setAccessToken(response.accessToken);
      await setRefreshToken(response.refreshToken);

      setUser({
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
        department: response.user.department,
        avatar: response.user.avatar || response.user.name.substring(0, 2).toUpperCase(),
        title: response.user.title || '',
        phone: response.user.phone || '',
        managerId: response.user.managerId,
      });
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Ignore logout errors
    }
    await clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN': return '#7C3AED';
    case 'HR_ADMIN': return '#0EA5E9';
    case 'IT_ADMIN': return '#10B981';
    case 'FINANCE_ADMIN': return '#F59E0B';
    case 'MANAGER': return '#6366F1';
    default: return '#64748B';
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super Admin';
    case 'HR_ADMIN': return 'HR Admin';
    case 'IT_ADMIN': return 'IT Admin';
    case 'FINANCE_ADMIN': return 'Finance Admin';
    case 'MANAGER': return 'Manager';
    default: return 'Employee';
  }
}
