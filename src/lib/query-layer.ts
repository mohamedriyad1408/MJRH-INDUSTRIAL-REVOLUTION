import { supabase } from "@/integrations/supabase/client";

export const queryLayer = {
  isLegacy: (tenantSlug: string) => tenantSlug === "dry-tech" || tenantSlug === "laundry-showcase",

  fetchActiveOrders: async (tenantId: string, branchId?: string, tenantSlug?: string) => {
    if (tenantSlug && queryLayer.isLegacy(tenantSlug)) {
        let q = supabase.from("orders").select("*, customers(full_name, phone), branches(name)").eq("tenant_id", tenantId).neq("status", "cancelled").order("created_at", { ascending: false });
        if (branchId && branchId !== "all") q = q.eq("branch_id", branchId);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }
    const { data, error } = await supabase.from("v4_l4.work_orders" as any).select("*").eq("status", "RUNNING").eq("node_id", tenantId);
    if (error) throw error;
    return (data || []).map((wo: any) => ({ ...wo, total: wo.payload?.total_amount || 0, customers: wo.payload?.customer_data || { full_name: "Sovereign" } }));
  },

  fetchOrderDetails: async (orderId: string, tenantSlug?: string) => {
    if (tenantSlug && queryLayer.isLegacy(tenantSlug)) {
        const { data, error } = await supabase.from("orders").select("*, customers(full_name, phone), order_items(*)").eq("id", orderId).single();
        if (error) throw error;
        return data;
    }
    const { data, error } = await supabase.from("v4_l4.work_orders" as any).select("*").eq("id", orderId).single();
    if (error) throw error;
    return { ...data, order_items: data.payload?.items || [] };
  },

  fetchCustomers: async (tenantId: string, tenantSlug?: string) => {
    const { data, error } = await supabase.from("customers").select("*").eq("tenant_id", tenantId).order("full_name");
    if (error) throw error;
    return data || [];
  },

  fetchCashAccounts: async (tenantId: string, branchId?: string, tenantSlug?: string) => {
    if (tenantSlug && queryLayer.isLegacy(tenantSlug)) {
        let q = supabase.from("cash_accounts").select("*, branches(name)").eq("tenant_id", tenantId).eq("is_active", true);
        if (branchId && branchId !== "all") q = q.eq("branch_id", branchId);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }
    const { data, error } = await supabase.from("v4_l3.resource_registry" as any).select("*").eq("resource_type", "Cash").eq("org_node_id", tenantId);
    if (error) throw error;
    return (data || []).map((r: any) => ({ ...r, current_balance: r.metadata?.current_balance || 0 }));
  }
};
