import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { apiClient, setAccessToken, setRefreshToken, clearTokens, getAccessToken } from '@/lib/api';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth config — replace with your actual Client ID
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

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
  login: (email: string, password: string) => Promise<{ mfaRequired?: boolean, mfaToken?: string } | void>;
  loginWithMfa: (mfaToken: string, code: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
  { id: 'u4', name: 'Priya Sharma', email: 'priya.sharma@company.com', role: 'IT_ADMIN', department: 'Information Technology', avatar: 'PS', title: 'IT Administrator', phone: '+1 (555) 456-7890' },
  { id: 'u5', name: 'David Kim', email: 'david.kim@company.com', role: 'FINANCE_ADMIN', department: 'Finance', avatar: 'DK', title: 'Finance Director', phone: '+1 (555) 567-8901' },
  { id: 'u6', name: 'Emma Wilson', email: 'emma.wilson@company.com', role: 'SUPER_ADMIN', department: 'Executive', avatar: 'EW', title: 'CEO', phone: '+1 (555) 678-9012' },
];

function mapResponseToUser(response: any): User {
  return {
    id: response.user.id,
    name: response.user.name,
    email: response.user.email,
    role: response.user.role,
    department: response.user.department,
    avatar: response.user.avatar || response.user.name.substring(0, 2).toUpperCase(),
    title: response.user.title || '',
    phone: response.user.phone || '',
    managerId: response.user.managerId,
  };
}

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

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      if (response.mfaRequired) {
        return { mfaRequired: true, mfaToken: response.mfaToken };
      }
      await setAccessToken(response.accessToken);
      await setRefreshToken(response.refreshToken);
      setUser(mapResponseToUser(response));
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  }, []);

  const loginWithMfa = useCallback(async (mfaToken: string, code: string) => {
    try {
      const response = await apiClient.loginWithMfa(mfaToken, code);
      await setAccessToken(response.accessToken);
      await setRefreshToken(response.refreshToken);
      setUser(mapResponseToUser(response));
    } catch (err) {
      console.error('MFA Login failed:', err);
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    try {
      const response = await apiClient.register(name, email, password, role);
      await setAccessToken(response.accessToken);
      await setRefreshToken(response.refreshToken);
      setUser(mapResponseToUser(response));
    } catch (err) {
      console.error('Register failed:', err);
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use implicit flow (AuthRequest → id_token → backend POST)
        const redirectUri = AuthSession.makeRedirectUri({ scheme: 'servicehub' });
        console.log('🔗 Google OAuth redirect URI (web):', redirectUri);

        const request = new AuthSession.AuthRequest({
          clientId: GOOGLE_CLIENT_ID,
          scopes: ['openid', 'profile', 'email'],
          redirectUri,
          responseType: AuthSession.ResponseType.IdToken,
          usePKCE: false,
          prompt: AuthSession.Prompt.SelectAccount, // Force account selection
          extraParams: {
            nonce: Math.random().toString(36).substring(2),
          },
        });

        const result = await request.promptAsync(discovery);

        if (result.type === 'success' && result.params?.id_token) {
          const idToken = result.params.id_token;
          const response = await apiClient.googleLogin(idToken);
          await setAccessToken(response.accessToken);
          await setRefreshToken(response.refreshToken);
          setUser(mapResponseToUser(response));
        } else if (result.type === 'error') {
          throw new Error(result.error?.message || 'Google Sign-In failed');
        }
      } else {
        // Mobile: Use backend callback flow via tunnel
        // Expo Go only handles exp:// URLs, not custom schemes like servicehub://
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
        const callbackUrl = `${apiUrl}/api/auth/google/callback`;

        // Get the Expo Go return URL (e.g. exp://192.168.1.9:8081)
        const returnUrl = AuthSession.makeRedirectUri({ scheme: 'servicehub' });
        console.log('🔗 Return URL for Expo Go:', returnUrl);

        // Build Google OAuth URL — pass returnUrl via state param so backend knows where to redirect
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${GOOGLE_CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent('openid profile email')}` +
          `&state=${encodeURIComponent(returnUrl)}` +
          `&prompt=select_account` + // Force account selection
          `&access_type=offline`;

        console.log('🔗 Callback URL:', callbackUrl);

        const result = await WebBrowser.openAuthSessionAsync(
          googleAuthUrl,
          returnUrl  // Expo Go listens for exp:// URLs
        );

        if (result.type === 'success' && result.url) {
          // Parse tokens from the deep link URL
          const url = new URL(result.url);
          const accessToken = url.searchParams.get('accessToken');
          const refreshToken = url.searchParams.get('refreshToken');
          const userData = url.searchParams.get('user');

          if (accessToken && refreshToken && userData) {
            await setAccessToken(accessToken);
            await setRefreshToken(refreshToken);
            const parsedUser = JSON.parse(decodeURIComponent(userData));
            setUser({
              id: parsedUser.id,
              name: parsedUser.name,
              email: parsedUser.email,
              role: parsedUser.role,
              department: parsedUser.department,
              avatar: parsedUser.avatar || parsedUser.name.substring(0, 2).toUpperCase(),
              title: parsedUser.title || '',
              phone: parsedUser.phone || '',
              managerId: parsedUser.managerId,
            });
          } else {
            throw new Error('Missing tokens in callback response');
          }
        }
        // type === 'cancel'/'dismiss' means user cancelled — do nothing
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err);
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
    loginWithMfa,
    register,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
  }), [user, isLoading, login, loginWithMfa, register, loginWithGoogle, logout]);

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
