import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const DEMO_USERS: Record<UserRole, User> = {
  EMPLOYEE: {
    id: 'u1',
    name: 'Alex Rivera',
    email: 'alex.rivera@company.com',
    role: 'EMPLOYEE',
    department: 'Engineering',
    avatar: 'AR',
    title: 'Software Engineer',
    phone: '+1 (555) 123-4567',
    managerId: 'u2',
  },
  MANAGER: {
    id: 'u2',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    role: 'MANAGER',
    department: 'Engineering',
    avatar: 'SC',
    title: 'Engineering Manager',
    phone: '+1 (555) 234-5678',
  },
  HR_ADMIN: {
    id: 'u3',
    name: 'Michael Torres',
    email: 'michael.torres@company.com',
    role: 'HR_ADMIN',
    department: 'Human Resources',
    avatar: 'MT',
    title: 'HR Director',
    phone: '+1 (555) 345-6789',
  },
  IT_ADMIN: {
    id: 'u4',
    name: 'Priya Sharma',
    email: 'priya.sharma@company.com',
    role: 'IT_ADMIN',
    department: 'IT',
    avatar: 'PS',
    title: 'IT Administrator',
    phone: '+1 (555) 456-7890',
  },
  FINANCE_ADMIN: {
    id: 'u5',
    name: 'David Kim',
    email: 'david.kim@company.com',
    role: 'FINANCE_ADMIN',
    department: 'Finance',
    avatar: 'DK',
    title: 'Finance Manager',
    phone: '+1 (555) 567-8901',
  },
  SUPER_ADMIN: {
    id: 'u6',
    name: 'Emma Wilson',
    email: 'emma.wilson@company.com',
    role: 'SUPER_ADMIN',
    department: 'Executive',
    avatar: 'EW',
    title: 'Chief Operations Officer',
    phone: '+1 (555) 678-9012',
  },
};

export const ALL_USERS: User[] = Object.values(DEMO_USERS);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('currentUser').then((data) => {
      if (data) {
        setUser(JSON.parse(data));
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (_email: string, role: UserRole) => {
    const demoUser = DEMO_USERS[role];
    await AsyncStorage.setItem('currentUser', JSON.stringify(demoUser));
    setUser(demoUser);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('currentUser');
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
