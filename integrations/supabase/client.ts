import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL       = (import.meta.env.VITE_SUPABASE_URL as string) || "https://dngjfjrjddigqadlyain.supabase.co";
const SUPABASE_ANON_KEY  = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
                           (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
                           "sb_publishable_JRp6rlQy0si3ZEA4WAHIYw_3dlJ4hfY";

type SupabaseCustomClient = {
  from: (table: string) => { select: (columns?: string, options?: any) => any; insert: (p: any, options?: any) => any; update: (p: any, options?: any) => any; delete: (options?: any) => any; upsert: (p: any, options?: any) => any };
  rpc: (fn: string, params?: any) => any;
  auth: { getUser: (jwt?: string) => Promise<{ data: { user: any }; error: any }>; onAuthStateChange: (fn: (event: any, session: any) => void) => { data: { subscription: { unsubscribe: () => void } } }; getSession: () => Promise<{ data: { session: any }; error: any }>; signOut: () => Promise<{ error: any }>; signUp: (p: any) => Promise<{ data: any; error: any }>; signInWithPassword: (p: any) => Promise<{ data: any; error: any }>; resetPasswordForEmail: (email: string, options?: any) => Promise<{ data: any; error: any }>; updateUser: (p: any) => Promise<{ data: any; error: any }> };
  functions: { invoke: <T>(fn: string, p?: any) => Promise<{ data: T; error: any }> };
  storage: any;
  [key: string]: any;
};

export const supabase: SupabaseCustomClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
}) as unknown as SupabaseCustomClient;
