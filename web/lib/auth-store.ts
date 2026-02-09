import { create } from "zustand";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  initialize: () => void;
}

/**
 * Zustand auth store.
 *
 * Tokens and user data are persisted to localStorage so the session
 * survives page reloads. The `initialize` method should be called once
 * on app mount to rehydrate state.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  // ------------------------------------------------------------------ login
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || body.message || "Invalid credentials, partner."
      );
    }

    const { accessToken, refreshToken, user } = await res.json();

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));

    set({ user, accessToken, isAuthenticated: true });
  },

  // --------------------------------------------------------------- register
  register: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || body.message || "Registration failed. Try again, friend."
      );
    }

    const { accessToken, refreshToken, user } = await res.json();

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));

    set({ user, accessToken, isAuthenticated: true });
  },

  // ----------------------------------------------------------------- logout
  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  // ------------------------------------------------------------- refreshAuth
  refreshAuth: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      get().logout();
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        get().logout();
        return;
      }

      const data = await res.json();

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      set({ accessToken: data.accessToken, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },

  // ------------------------------------------------------------- initialize
  initialize: () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    const userRaw = localStorage.getItem("user");

    if (!accessToken || !userRaw) {
      set({ isLoading: false });
      return;
    }

    try {
      const user: AuthUser = JSON.parse(userRaw);

      // Quick JWT expiry check (decode payload without verifying sig)
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        // Token expired -- try a silent refresh
        set({ user, isLoading: true });
        get()
          .refreshAuth()
          .then(() => {
            // If refresh succeeded the store already has a new token
            const currentToken = get().accessToken;
            if (currentToken) {
              set({ user, isAuthenticated: true, isLoading: false });
            } else {
              set({ isLoading: false });
            }
          })
          .catch(() => {
            get().logout();
            set({ isLoading: false });
          });
        return;
      }

      set({ user, accessToken, isAuthenticated: true, isLoading: false });
    } catch {
      // Corrupt data in localStorage
      get().logout();
      set({ isLoading: false });
    }
  },
}));
