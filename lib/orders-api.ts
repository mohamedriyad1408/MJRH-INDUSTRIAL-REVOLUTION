import { supabase } from "@/integrations/supabase/client";
import { logEvent, EVENTS } from "./event-logger";

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
  source?: string;
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
      qc_status: "Pending",
      source: payload.source || "WALK_IN",
      queue_status: payload.source === "ONLINE" ? "IN_QUEUE" : "RECEIVED"
    })
    .select("id, order_number")
    .single();

  if (orderError) throw orderError;

  // 3. Insert Order Items
  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(
      payload.items.map((it: any) => ({
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
  await logEvent({
    event_type: EVENTS.ORDER_CREATED,
    tenant_id: payload.tenant_id,
    order_id: order.id,
    payload: { 
      order_number: order.order_number,
      total: payload.total,
      items_count: payload.items.length 
    }
  });

  return order;
}

/**
 * T-007: تفعيل فحص الجودة (QC Logic)
 */
export async function updateOrderQC(
  orderId: string,
  status: 'PASSED' | 'FAILED',
  tenantId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, qc_status, tenant_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: 'الطلب غير موجود' };
    }

    if (order.qc_status === 'PASSED') {
      return { success: false, error: 'هذا الطلب قد اجتاز فحص الجودة بالفعل' };
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        qc_status: status as any,
        qc_notes: notes || '',
        qc_checked_at: new Date().toISOString(),
        status: status === 'PASSED' ? 'ready' : 'received'
      })
      .eq('id', orderId);

    if (updateError) {
      if (updateError.message?.includes('POL-001')) {
        return { success: false, error: 'لا يمكن التسليم قبل إجراء فحص الجودة' };
      }
      return { success: false, error: 'فشل تحديث فحص الجودة' };
    }

    await logEvent({
      event_type: status === 'PASSED' ? EVENTS.QC_PASSED : EVENTS.QC_FAILED,
      tenant_id: tenantId,
      order_id: orderId,
      payload: { status, notes },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
}

/**
 * T-011: Online Order Queue Management
 */
export async function receiveOnlineOrder(
  orderId: string,
  tenantId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, source, queue_status, tenant_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) return { success: false, error: 'الطلب غير موجود' };
    if (order.source !== 'ONLINE') return { success: false, error: 'هذا الطلب ليس طلباً أونلاين' };
    if (order.queue_status !== 'IN_QUEUE') return { success: false, error: 'الطلب ليس في قائمة الانتظار' };

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        queue_status: 'RECEIVED',
        status: 'received',
      })
      .eq('id', orderId);

    if (updateError) return { success: false, error: 'فشل استلام الطلب' };

    await logEvent({
      event_type: EVENTS.ORDER_RECEIVED,
      tenant_id: tenantId,
      order_id: orderId,
      user_id: userId,
      payload: { source: 'ONLINE' },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
}

export async function getOnlineQueue(tenantId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(full_name, phone)')
    .eq('tenant_id', tenantId)
    .eq('source', 'ONLINE')
    .eq('queue_status', 'IN_QUEUE')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getOrdersByStatus(tenantId: string, status: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(full_name, phone)')
    .eq('tenant_id', tenantId)
    .eq('status', status.toLowerCase())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(orderId: string, tenantId: string, newStatus: string, userId?: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus.toLowerCase() })
      .eq('id', orderId);

    if (error) throw error;

    const eventMap: Record<string, string> = {
      READY: EVENTS.ORDER_READY,
      DELIVERED: EVENTS.ORDER_DELIVERED,
      CLEANING: EVENTS.CLEANING_STARTED,
    };

    if (eventMap[newStatus.toUpperCase()]) {
      await logEvent({
        event_type: eventMap[newStatus.toUpperCase()],
        tenant_id: tenantId,
        order_id: orderId,
        user_id: userId,
      });
    }
    return { success: true };
}
