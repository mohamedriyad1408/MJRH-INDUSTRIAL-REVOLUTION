import { supabase } from "@/integrations/supabase/client";

export type Subscription = {
  id: string;
  tenant_id: string;
  branch_id?: string | null;
  customer_id: string;
  plan_name: string;
  item_quota: number;
  remaining_quota: number;
  price: number;
  start_date: string;
  renewal_date: string;
  status: "active" | "expired" | "cancelled";
  customer_name?: string;
  customer_phone?: string;
  branch_name?: string;
};

export async function getActiveSubscription(tenantId: string, customerId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("customer_subscriptions")
    .select("*, customers(full_name, phone), branches(name)")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .eq("status", "active")
    .gte("renewal_date", new Date().toISOString().slice(0, 10))
    .order("renewal_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;
  const row: any = data;
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    branch_id: row.branch_id,
    customer_id: row.customer_id,
    plan_name: row.plan_name,
    item_quota: row.item_quota,
    remaining_quota: row.remaining_quota,
    price: Number(row.price ?? 0),
    start_date: row.start_date,
    renewal_date: row.renewal_date,
    status: row.status,
    customer_name: row.customers?.full_name,
    customer_phone: row.customers?.phone,
    branch_name: row.branches?.name,
  };
}

export async function deductQuota(tenantId: string, customerId: string, itemsCount: number, orderId?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("deduct_subscription_quota", {
    _tenant_id: tenantId,
    _customer_id: customerId,
    _items_count: itemsCount,
    _order_id: orderId || null,
  });
  if (error) {
    console.error("deductQuota error", error);
    return false;
  }
  return !!data;
}
