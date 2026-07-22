// ============================================
// T-012: Event Logger (جميع الأحداث)
// ============================================
import { supabase } from "@/integrations/supabase/client";

export const EVENTS = {
  // Order Events
  ORDER_CREATED: 'EVT-001',
  ORDER_RECEIVED: 'EVT-002',
  CLEANING_STARTED: 'EVT-003',
  CLEANING_FINISHED: 'EVT-004',
  IRONING_STARTED: 'EVT-005',
  IRONING_FINISHED: 'EVT-006',
  QC_PASSED: 'EVT-007',
  QC_FAILED: 'EVT-008',
  ORDER_READY: 'EVT-009',
  ORDER_DELIVERED: 'EVT-010',
  // Finance Events
  INVOICE_ISSUED: 'EVT-011',
  PAYMENT_COLLECTED: 'EVT-012',
  PAYMENT_REFUNDED: 'EVT-013',
  // HR Events
  EMPLOYEE_CHECKED_IN: 'EVT-014',
  EMPLOYEE_CHECKED_OUT: 'EVT-015',
  // Customer Events
  CUSTOMER_CREATED: 'EVT-016',
  // Legal Events
  CONTRACT_SIGNED: 'EVT-017',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

export async function logEvent({
  event_type,
  tenant_id,
  order_id,
  user_id,
  payload,
}: {
  event_type: string;
  tenant_id: string;
  order_id?: string;
  user_id?: string;
  payload?: any;
}) {
  const { error } = await supabase.from('event_log').insert({
    event_type,
    tenant_id,
    order_id,
    actor_id: user_id, // Note: DB column is actor_id
    payload: payload || {},
    occurred_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to log event:', error);
  }
}

// ============================================
// دوال مساعدة لتسجيل الأحداث بسهولة
// ============================================
export async function logOrderReady(orderId: string, tenantId: string) {
  return logEvent({
    event_type: EVENTS.ORDER_READY,
    tenant_id: tenantId,
    order_id: orderId,
    payload: { timestamp: new Date().toISOString() },
  });
}

export async function logOrderDelivered(orderId: string, tenantId: string, deliveredBy: string) {
  return logEvent({
    event_type: EVENTS.ORDER_DELIVERED,
    tenant_id: tenantId,
    order_id: orderId,
    user_id: deliveredBy,
    payload: { delivered_at: new Date().toISOString() },
  });
}

export async function logPaymentCollected(
  orderId: string,
  tenantId: string,
  amount: number,
  method: string
) {
  return logEvent({
    event_type: EVENTS.PAYMENT_COLLECTED,
    tenant_id: tenantId,
    order_id: orderId,
    payload: { amount, method, collected_at: new Date().toISOString() },
  });
}
