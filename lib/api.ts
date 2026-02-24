import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const TOKEN_KEY = "servicehub_access_token";
const REFRESH_TOKEN_KEY = "servicehub_refresh_token";

// Determine backend URL based on platform
export function getBaseUrl(): string {
    const BACKEND_PORT = "5000";

    // Web: localhost works fine
    if (Platform.OS === "web") {
        return `http://localhost:${BACKEND_PORT}`;
    }

    // Native (physical device or emulator):
    // Expo exposes the dev machine's LAN IP via hostUri (e.g. "192.168.1.5:8081")
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
        const host = hostUri.split(":")[0]; // extract just the IP
        return `http://${host}:${BACKEND_PORT}`;
    }

    // Fallback for Android emulator
    if (Platform.OS === "android") {
        return `http://10.0.2.2:${BACKEND_PORT}`;
    }

    // Fallback for iOS simulator
    return `http://localhost:${BACKEND_PORT}`;
}

const BASE_URL = getBaseUrl();

// ── Token Management ───────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export async function clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

// ── API Client ─────────────────────────────────────────────────────────────

interface ApiOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    skipAuth?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            await clearTokens();
            return null;
        }

        const data = await response.json();
        await setAccessToken(data.accessToken);
        await setRefreshToken(data.refreshToken);
        return data.accessToken;
    } catch {
        await clearTokens();
        return null;
    }
}

export async function api<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, skipAuth = false } = options;

    const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "69420",
        ...headers,
    };

    if (!skipAuth) {
        const token = await getAccessToken();
        if (token) {
            requestHeaders["Authorization"] = `Bearer ${token}`;
        }
    }

    let response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

    // If 401, try refreshing the token
    if (response.status === 401 && !skipAuth) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            requestHeaders["Authorization"] = `Bearer ${newToken}`;
            response = await fetch(`${BASE_URL}${endpoint}`, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
            });
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Request failed" }));
        if (errorData.errors && Array.isArray(errorData.errors)) {
            const details = errorData.errors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
            throw new Error(`${errorData.message}: ${details}`);
        }
        throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// ── Convenience Methods ────────────────────────────────────────────────────

export const apiClient = {
    // Auth
    login: (email: string, password: string) =>
        api("/api/auth/login", { method: "POST", body: { email, password }, skipAuth: true }),

    refresh: () =>
        api("/api/auth/refresh", { method: "POST" }),

    logout: async () => {
        const refreshToken = await getRefreshToken();
        return api("/api/auth/logout", { method: "POST", body: { refreshToken } });
    },

    getMe: () =>
        api("/api/auth/me"),

    // Users
    getUsers: (params?: { department?: string; role?: string; search?: string }) => {
        const query = new URLSearchParams();
        if (params?.department) query.set("department", params.department);
        if (params?.role) query.set("role", params.role);
        if (params?.search) query.set("search", params.search);
        const qs = query.toString();
        return api(`/api/users${qs ? `?${qs}` : ""}`);
    },

    getUserById: (id: string) =>
        api(`/api/users/${id}`),

    // Leaves
    getLeaves: () =>
        api("/api/leaves"),

    getLeaveBalance: () =>
        api("/api/leaves/balance"),

    createLeave: (data: { leaveType: string; startDate: string; endDate: string; reason: string }) =>
        api("/api/leaves", { method: "POST", body: data }),

    approveLeave: (id: string, action: string, comment: string) =>
        api(`/api/leaves/${id}/approve`, { method: "PATCH", body: { action, comment } }),

    // Tickets
    getTickets: () =>
        api("/api/tickets"),

    createTicket: (data: { title: string; description: string; category: string; priority: string }) =>
        api("/api/tickets", { method: "POST", body: data }),

    updateTicketStatus: (id: string, status: string, assignedTo?: string) =>
        api(`/api/tickets/${id}/status`, { method: "PATCH", body: { status, assignedTo } }),

    addTicketComment: (ticketId: string, content: string) =>
        api(`/api/tickets/${ticketId}/comments`, { method: "POST", body: { content } }),

    // Expenses
    getExpenses: () =>
        api("/api/expenses"),

    createExpense: (data: { title: string; description: string; amount: number; currency: string; category: string }) =>
        api("/api/expenses", { method: "POST", body: data }),

    approveExpense: (id: string, action: string, comment: string) =>
        api(`/api/expenses/${id}/approve`, { method: "PATCH", body: { action, comment } }),

    // Notifications
    getNotifications: () =>
        api("/api/notifications"),

    getUnreadCount: () =>
        api("/api/notifications/unread-count"),

    markNotificationRead: (id: string) =>
        api(`/api/notifications/${id}/read`, { method: "PATCH" }),

    // Search
    search: (query: string) =>
        api(`/api/search?q=${encodeURIComponent(query)}`),

    // Google SSO
    googleLogin: (idToken: string) =>
        api("/api/auth/google", { method: "POST", body: { idToken }, skipAuth: true }),

    // Register
    register: (name: string, email: string, password: string, role: string) =>
        api("/api/auth/register", { method: "POST", body: { name, email, password, role }, skipAuth: true }),

    // MFA
    loginWithMfa: (mfaToken: string, code: string) =>
        api("/api/auth/login/mfa", { method: "POST", body: { mfaToken, code }, skipAuth: true }),
};
