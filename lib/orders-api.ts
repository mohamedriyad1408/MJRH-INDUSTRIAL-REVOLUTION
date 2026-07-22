import { supabase } from "@/integrations/supabase/client";

/**
 * T-004: Create Order API Logic
 * Implements CAP-001 (Order Intake)
 */
export async function createOrder(payload: {
  customer_id: string;
  tenant_id: string;
  branch_id: string;
  order_type: "walk_in" | "delivery";
  items: Array<{
    service_item_id: string;
    name: string;
    qty: number;
    unit_price: number;
    service_type: string;
  }>;
  total: number;
  notes?: string;
}) {
  // 1. Logic Validation
  if (payload.items.length === 0) throw new Error("يجب إضافة قطعة واحدة على الأقل");

  // 2. Insert Order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: payload.customer_id,
      tenant_id: payload.tenant_id,
      branch_id: payload.branch_id,
      order_type: payload.order_type,
      total: payload.total,
      notes: payload.notes,
      status: "received",
      qc_status: "Pending"
    })
    .select("id, order_number")
    .single();

  if (orderError) throw orderError;

  // 3. Insert Order Items
  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(
      payload.items.map(it => ({
        order_id: order.id,
        service_item_id: it.service_item_id,
        name: it.name,
        qty: it.qty,
        unit_price: it.unit_price,
        service_type: it.service_type as any
      }))
    );

  if (itemsError) throw itemsError;

  // 4. Log Event (EVT-001)
  await supabase.from("event_log").insert({
    tenant_id: payload.tenant_id,
    order_id: order.id,
    event_type: "OrderCreated",
    payload: { 
      order_number: order.order_number,
      total: payload.total,
      items_count: payload.items.length 
    }
  });

  return order;
}

/**
 * T-007: Update QC Status API Logic
 * Implements CAP-003 (Quality Assurance)
 */
export async function updateOrderQC(payload: {
  order_id: string;
  tenant_id: string;
  qc_status: "Passed" | "Failed";
  notes?: string;
}) {
  const { error } = await supabase
    .from("orders")
    .update({ qc_status: payload.qc_status })
    .eq("id", payload.order_id);

  if (error) throw error;

  // Log Event (EVT-007 or EVT-008)
  await supabase.from("event_log").insert({
    tenant_id: payload.tenant_id,
    order_id: payload.order_id,
    event_type: payload.qc_status === "Passed" ? "QCPassed" : "QCFailed",
    payload: { 
      qc_status: payload.qc_status,
      notes: payload.notes 
    }
  });

  return { ok: true };
}
