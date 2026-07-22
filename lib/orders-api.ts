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
  await logEvent({
    event_type: "OrderCreated",
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
 * سجل نتيجة فحص الجودة لطلب معين
 * @param orderId - معرف الطلب
 * @param status - نتيجة الفحص: 'PASSED' أو 'FAILED'
 * @param tenantId - معرف المؤسسة
 * @param notes - ملاحظات إضافية (اختياري)
 */
export async function updateOrderQC(
  orderId: string,
  status: 'PASSED' | 'FAILED',
  tenantId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. جلب الطلب الحالي للتأكد من وجوده وحالته
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, qc_status, tenant_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('Order not found:', fetchError);
      return { success: false, error: 'الطلب غير موجود' };
    }

    // 2. منع إعادة فحص الطلب إذا كان قد اجتاز QC بالفعل
    if (order.qc_status === 'PASSED') {
      return { success: false, error: 'هذا الطلب قد اجتاز فحص الجودة بالفعل' };
    }

    // 3. تحديث QC في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        qc_status: status as any,
        qc_notes: notes || '',
        qc_checked_at: new Date().toISOString(),
        // إذا نجح QC، نحدّث الحالة إلى READY تلقائياً
        status: status === 'PASSED' ? 'ready' : 'received' // Fallback
      })
      .eq('id', orderId);

    if (updateError) {
      // تحقق مما إذا كان الخطأ ناتجاً عن انتهاك POL-001
      if (updateError.message?.includes('POL-001')) {
        return { success: false, error: 'لا يمكن التسليم قبل إجراء فحص الجودة' };
      }
      console.error('QC update failed:', updateError);
      return { success: false, error: 'فشل تحديث فحص الجودة' };
    }

    // 4. تسجيل حدث في event_log
    const eventType = status === 'PASSED' ? 'EVT-007' : 'EVT-008';
    await logEvent({
      event_type: eventType,
      tenant_id: tenantId,
      order_id: orderId,
      payload: { status, notes },
    });

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateOrderQC:', error);
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
}

/**
 * دالة مساعدة لتسجيل الأحداث
 */
async function logEvent({
  event_type,
  tenant_id,
  order_id,
  payload,
}: {
  event_type: string;
  tenant_id: string;
  order_id?: string;
  payload: any;
}) {
  await supabase.from('event_log').insert({
    event_type,
    tenant_id,
    order_id,
    payload,
    occurred_at: new Date().toISOString(),
  });
}
