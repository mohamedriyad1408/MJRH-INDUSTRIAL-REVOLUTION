import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export type AppRole = "super_admin" | "owner" | "cs_manager" | "ops_manager" | "employee" | "customer" | "courier";

type RoleRow = { role: AppRole; tenant_id: string | null };

type AuthCtx = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  tenantId: string | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (...r: AppRole[]) => boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roleRows, setRoleRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role, tenant_id").eq("user_id", uid);
    setRoleRows(((data ?? []) as RoleRow[]));
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadRoles(s.user.id), 0);
      else setRoleRows([]);
      qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roles = roleRows.map((r) => r.role);
  const isSuperAdmin = roles.includes("super_admin");
  const tenantId = roleRows.find((r) => r.tenant_id)?.tenant_id ?? null;

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    roles,
    tenantId,
    isSuperAdmin,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
    hasRole: (...r) => r.some((x) => roles.includes(x)),
    refresh: async () => { if (session?.user) await loadRoles(session.user.id); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
