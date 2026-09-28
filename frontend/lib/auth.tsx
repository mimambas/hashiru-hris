"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, clearTokens, getAccessToken, setTokens } from "./api";

export type Role =
  | "super_admin"
  | "hr_director"
  | "hr_manager"
  | "hr_officer"
  | "recruiter"
  | "finance_officer"
  | "dept_manager"
  | "team_leader"
  | "employee";

export interface EmployeeSummary {
  id: string;
  full_name: string;
  photo_url?: string | null;
  position?: { title?: string } | null;
  department?: { name?: string } | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  employee: EmployeeSummary | null;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getAccessToken()) {
      void fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<LoginResponse>(
        "/auth/login",
        { email, password },
        { anonymous: true },
      );
      setTokens(res.access_token, res.refresh_token);
      setLoading(true);
      await fetchMe();
    },
    [fetchMe],
  );

  const logout = useCallback(() => {
    // Best-effort: beri tahu backend, tapi jangan blokir logout lokal.
    api.post("/auth/logout").catch(() => undefined);
    clearTokens();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      loading,
      login,
      logout,
      hasRole,
      refreshUser: fetchMe,
    }),
    [user, loading, login, logout, hasRole, fetchMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
