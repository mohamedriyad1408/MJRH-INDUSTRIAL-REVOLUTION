/**
 * MJRH — Unified Query Layer (V4 Sovereign Bridge Edition)
 * Maps Legacy V2/V3 UI calls to V4 Sovereign Logic.
 */
import { supabase } from "@/integrations/supabase/client";

export const queryLayer = {
  // Orders & Workflow (Mapped to V4 Work Orders)
  fetchActiveOrders: async (tenantId: string, branchId?: string) => {
    let q = supabase.from("v4_l4.work_orders" as any)
      .select("*")
      .eq("status", "RUNNING")
      .order("created_at", { ascending: false });
    
    if (branchId && branchId !== "all") {
        q = q.eq("node_id", branchId);
    } else {
        q = q.eq("node_id", tenantId);
    }
    
    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []).map((wo: any) => ({
      ...wo,
      tenant_id: wo.node_id,
      order_number: wo.payload?.order_number || "GEN-" + wo.id.slice(0,5),
      total: wo.payload?.total_amount || 0,
      customers: wo.payload?.customer_data || { full_name: "Migrated", phone: "" },
      branches: { name: "Sovereign Unit" }
    }));
  },

  fetchOrderDetails: async (orderId: string) => {
    const { data, error } = await supabase.from("v4_l4.work_orders" as any)
      .select("*")
      .eq("id", orderId)
      .single();
    if (error) throw error;

    return {
      ...data,
      tenant_id: data.node_id,
      order_items: data.payload?.items || [],
      customers: data.payload?.customer_data || { full_name: "Sovereign Identity", phone: "" }
    };
  },

  // Finance & Cash (Mapped to L3 Resource Registry)
  fetchCashAccounts: async (tenantId: string, branchId?: string) => {
    let q = supabase.from("v4_l3.resource_registry" as any)
      .select("*")
      .eq("resource_type", "Cash")
      .eq("is_active", true);
    
    if (branchId && branchId !== "all") q = q.eq("org_node_id", branchId);
    else q = q.eq("org_node_id", tenantId);

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []).map((res: any) => ({
      ...res,
      id: res.id,
      name: res.name,
      current_balance: res.metadata?.current_balance || 0,
      branches: { name: "Sovereign Branch" }
    }));
  },

  fetchFinancialAudit: async (tenantId: string, limit = 80) => {
    const { data, error } = await supabase.from("v4_l5.v_audit_vault" as any)
      .select("*")
      .eq("sovereign_root_id", tenantId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  fetchOperationMatrix: async (tenantId: string, limit = 80) => {
    const { data, error } = await supabase.from("v4_l4.v_pulse_stream" as any)
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  fetchTenantSettings: async (tenantId: string) => {
    const { data, error } = await supabase.from("v4_l7.branding_profiles" as any)
      .select("*")
      .eq("sovereign_root_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  submitOrderMove: async (orderId: string, _fromStatus: string, toStatus: string, userId?: string, notes?: string) => {
    const { error } = await supabase.rpc("rpc_pulse_job", {
      _job_id: orderId,
      _target_activity_id: toStatus,
      _payload: { "notes": notes, "moved_by": userId }
    });
    
    if (error) throw error;
    return true;
  },
};
