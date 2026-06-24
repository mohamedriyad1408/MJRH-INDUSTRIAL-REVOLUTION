/**
 * MJRH — Admin API Client
 * Calls the Supabase Edge Function "admin-actions" which replaced
 * the TanStack Start server functions.
 */
import { supabase } from "@/integrations/supabase/client";

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("admin-actions", {
    body: { action, ...payload },
  });
  if (error) throw new Error(typeof error === "string" ? error : (error as any).message ?? "خطأ غير متوقع");
  return data as T;
}

export const adminApi = {
  createTenant:      (p: { name: string; slug: string; ownerEmail: string; ownerPassword: string; ownerFullName: string; lat?: number | null; lng?: number | null; locationUrl?: string | null; operatingRadiusKm?: number | null }) =>
    call<{ tenant_id: string }>("createTenant", p),

  createTenantUser:  (p: { tenantId: string; email: string; password: string; fullName: string; role: string; station?: string | null; jobRole?: string | null; monthlySalary?: number; commissionPercent?: number }) =>
    call<{ user_id: string }>("createTenantUser", p),

  listAllUsers:      () =>
    call<{ users: any[] }>("listAllUsers"),

  deleteUser:        (userId: string) =>
    call<{ ok: true }>("deleteUser", { userId }),

  resetUserPassword: (userId: string, newPassword: string) =>
    call<{ ok: true }>("resetUserPassword", { userId, newPassword }),
};
