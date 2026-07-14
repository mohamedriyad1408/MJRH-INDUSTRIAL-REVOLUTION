/**
 * MJRH — Unified Query Layer
 * Establishes a standardized, fully typed data access abstraction
 * replacing fragmented raw Supabase client calls.
 */
import { supabase } from "@/integrations/supabase/client";

export const queryLayer = {
  // Orders & Workflow
  fetchActiveOrders: async (tenantId: string, branchId?: string) => {
    let q = supabase.from("orders").select("*, customers(full_name, phone), branches(name)").eq("tenant_id", tenantId).neq("status", "cancelled").order("created_at", { ascending: false });
    if (branchId && branchId !== "all") q = q.eq("branch_id", branchId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  fetchOrderDetails: async (orderId: string) => {
    const { data, error } = await supabase.from("orders").select("*, customers(full_name, phone), order_items(*)").eq("id", orderId).single();
    if (error) throw error;
    return data;
  },

  // Finance & Cash
  fetchCashAccounts: async (tenantId: string, branchId?: string) => {
    let q = supabase.from("cash_accounts").select("*, branches(name)").eq("tenant_id", tenantId).eq("is_active", true).order("name");
    if (branchId && branchId !== "all") q = q.eq("branch_id", branchId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  // Operations & APDO
  fetchFinancialAudit: async (tenantId: string, limit = 80) => {
    const { data, error } = await supabase.from("financial_operation_audit").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  fetchOperationMatrix: async (tenantId: string, limit = 80) => {
    const { data, error } = await supabase.from("operation_answer_matrix").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  // Settings
  fetchTenantSettings: async (tenantId: string) => {
    const { data, error } = await supabase.from("app_settings").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (error) throw error;
    return data;
  },

  // Workflow Moves
  submitOrderMove: async (orderId: string, fromStatus: string, toStatus: string, userId?: string, notes?: string) => {
    const { error: uErr } = await supabase.from("orders").update({ status: toStatus }).eq("id", orderId);
    if (uErr) throw uErr;
    const { error: hErr } = await supabase.from("order_status_history").insert({
      order_id: orderId, from_status: fromStatus, to_status: toStatus, changed_by: userId, notes,
    });
    if (hErr) throw hErr;
    return true;
  },
};
