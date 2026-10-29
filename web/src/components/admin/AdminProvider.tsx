"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, shopConfigured } from "@/config/shop";
import { ApiError, shopApi } from "@/lib/shop/api";

export type StaffRole = "owner" | "admin" | "staff";
export interface Me {
  userId: string;
  email: string;
  fullName: string | null;
  role: StaffRole;
  currency: string;
  storeEnabled: boolean;
}

type AuthState =
  | { kind: "loading" }
  | { kind: "unconfigured" }
  | { kind: "signed-out" }
  | { kind: "set-password" }
  | { kind: "forbidden"; email: string | null }
  | { kind: "ready"; me: Me };

interface AdminContextValue {
  state: AuthState;
  me: Me | null;
  /** Llama a una función del panel con la sesión actual. */
  call: <T = unknown>(fn: string, args?: Record<string, unknown>) => Promise<T>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  supabase: () => Promise<SupabaseClient>;
  /** Ver pedidos de prueba en lugar de los reales. */
  showTest: boolean;
  setShowTest: (v: boolean) => void;
  can: (min: StaffRole) => boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);
const TEST_KEY = "aromatic-admin-test";
let clientPromise: Promise<SupabaseClient> | null = null;

/** Cliente de Supabase solo para la autenticación del personal (se carga en el panel). */
function getClient(): Promise<SupabaseClient> {
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
    }),
  );
  return clientPromise;
}

const RANK: Record<StaffRole, number> = { staff: 1, admin: 2, owner: 3 };

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(shopConfigured && SUPABASE_URL ? { kind: "loading" } : { kind: "unconfigured" });
  // El interruptor solo se pinta con la sesión lista (después de hidratar): leerlo al iniciar no desajusta el HTML.
  const [showTest, setShowTestState] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(TEST_KEY) === "1";
    } catch {
      return false;
    }
  });
  const sessionRef = useRef<Session | null>(null);

  const loadMe = useCallback(async (session: Session | null) => {
    sessionRef.current = session;
    if (!session) return setState({ kind: "signed-out" });
    try {
      const { data } = await shopApi.admin<{ data: Me }>("admin_me", {}, session.access_token);
      setState({ kind: "ready", me: data });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setState({ kind: "forbidden", email: session.user?.email ?? null });
      else if (err instanceof ApiError && err.status === 401) setState({ kind: "signed-out" });
      else setState({ kind: "signed-out" });
    }
  }, []);

  useEffect(() => {
    if (state.kind === "unconfigured") return;
    let unsub: (() => void) | undefined;
    const isSetPassword = typeof window !== "undefined" && /type=(recovery|invite)/.test(window.location.hash);
    getClient().then(async (sb) => {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") return setState({ kind: "set-password" });
        if (event === "SIGNED_OUT") {
          sessionRef.current = null;
          return setState({ kind: "signed-out" });
        }
        if (event === "TOKEN_REFRESHED") sessionRef.current = session;
      });
      unsub = () => data.subscription.unsubscribe();
      const { data: s } = await sb.auth.getSession();
      if (isSetPassword && s.session) {
        sessionRef.current = s.session;
        return setState({ kind: "set-password" });
      }
      await loadMe(s.session);
    });
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMe]);

  const value = useMemo<AdminContextValue>(() => {
    const me = state.kind === "ready" ? state.me : null;
    return {
      state,
      me,
      call: async <T,>(fn: string, args: Record<string, unknown> = {}) => {
        const sb = await getClient();
        const { data } = await sb.auth.getSession();
        const token = data.session?.access_token ?? sessionRef.current?.access_token;
        if (!token) {
          setState({ kind: "signed-out" });
          throw new ApiError(401, "unauthorized", "Inicia sesión para continuar.");
        }
        try {
          const res = await shopApi.admin<{ data: T }>(fn, args, token);
          return (res as { data: T }).data ?? (res as T);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) setState({ kind: "signed-out" });
          throw err;
        }
      },
      signIn: async (email, password) => {
        const sb = await getClient();
        const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new ApiError(401, "auth", "Correo o contraseña incorrectos.");
        await loadMe(data.session);
      },
      signOut: async () => {
        const sb = await getClient();
        await sb.auth.signOut();
        sessionRef.current = null;
        setState({ kind: "signed-out" });
      },
      resetPassword: async (email) => {
        const sb = await getClient();
        await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.href.split("#")[0] });
      },
      setPassword: async (password) => {
        const sb = await getClient();
        const { data, error } = await sb.auth.updateUser({ password });
        if (error) throw new ApiError(400, "auth", "No se pudo guardar la contraseña. Usa al menos 10 caracteres.");
        history.replaceState(null, "", window.location.pathname + window.location.search);
        const { data: s } = await sb.auth.getSession();
        await loadMe(s.session ?? (data.user ? sessionRef.current : null));
      },
      supabase: getClient,
      showTest,
      setShowTest: (v) => {
        setShowTestState(v);
        try {
          localStorage.setItem(TEST_KEY, v ? "1" : "0");
        } catch { /* sin almacenamiento */ }
      },
      can: (min) => (me ? RANK[me.role] >= RANK[min] : false),
    };
  }, [state, showTest, loadMe]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin debe usarse dentro de AdminProvider");
  return ctx;
}
