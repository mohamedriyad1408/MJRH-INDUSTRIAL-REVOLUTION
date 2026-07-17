import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export type AppRole = string;

type AuthCtx = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  authorities: string[];
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
  const [v4Context, setV4Context] = useState<{ roles: string[]; authorities: string[]; root_id: string | null }>({
    roles: [],
    authorities: [],
    root_id: null
  });
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  async function loadV4Context(uid: string) {
    // Calling the newly created Sovereign RPC for Actor Context
    const { data, error } = await supabase.rpc('fn_v_get_actor_roles', { 
        _actor_identity_id: uid 
    });
    
    if (error) {
        console.error("[V4_AUTH_ERROR]:", error.message);
        setV4Context({ roles: [], authorities: [], root_id: null });
        return;
    }

    const res = data as any;
    if (res.ok) {
        setV4Context({
            roles: res.roles || [],
            authorities: res.authorities || [],
            root_id: res.root_id
        });
    }
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: any) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadV4Context(s.user.id), 0);
      else setV4Context({ roles: [], authorities: [], root_id: null });
      qc.invalidateQueries();
    });
    
    supabase.auth.getSession().then(({ data }: any) => {
      setSession(data.session);
      if (data.session?.user) {
        loadV4Context(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    
    return () => sub.subscription.unsubscribe();
  }, []);

  // V4 Logic: SuperAdmin is defined by Strategic Governance or Cross-Root Authority
  const isSuperAdmin = v4Context.authorities.includes("STRATEGIC_GOVERNANCE") || v4Context.authorities.includes("CROSS_ROOT_AUDIT");
  const roles = v4Context.roles;
  const tenantId = v4Context.root_id;

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    roles,
    authorities: v4Context.authorities,
    tenantId,
    isSuperAdmin,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
    hasRole: (...r) => r.some((x) => roles.includes(x)),
    refresh: async () => { if (session?.user) await loadV4Context(session.user.id); },
  };
  
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
