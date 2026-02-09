import { create } from "zustand";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "super_admin" | "reviewer" | "warehouse";
}

export interface AdminAuthState {
  user: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Invalid credentials");
    }

    const { accessToken, refreshToken, user } = await res.json();

    localStorage.setItem("adminAccessToken", accessToken);
    localStorage.setItem("adminRefreshToken", refreshToken);
    localStorage.setItem("adminUser", JSON.stringify(user));

    set({ user, accessToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("adminAccessToken");
    localStorage.removeItem("adminRefreshToken");
    localStorage.removeItem("adminUser");
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  initialize: () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }

    const accessToken = localStorage.getItem("adminAccessToken");
    const userRaw = localStorage.getItem("adminUser");

    if (!accessToken || !userRaw) {
      set({ isLoading: false });
      return;
    }

    try {
      const user: AdminUser = JSON.parse(userRaw);
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        get().logout();
        set({ isLoading: false });
        return;
      }

      set({ user, accessToken, isAuthenticated: true, isLoading: false });
    } catch {
      get().logout();
      set({ isLoading: false });
    }
  },
}));
