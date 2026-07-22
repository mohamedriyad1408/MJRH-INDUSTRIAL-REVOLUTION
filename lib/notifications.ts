import { supabase } from '@/integrations/supabase/client';
import { logEvent } from './event-logger';

// ============================================
// T-030: Advanced Notification System
// ============================================

export async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Placeholder for Resend/SendGrid API
    console.log(`Sending email to ${to}: ${subject}`);
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: 'فشل إرسال البريد الإلكتروني' };
  }
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Placeholder for Twilio API
    console.log(`Sending SMS to ${to}: ${message}`);
    return { success: true };
  } catch (error) {
    console.error('SMS error:', error);
    return { success: false, error: 'فشل إرسال SMS' };
  }
}

export async function createInternalNotification(userId: string, tenantId: string | null, title: string, message: string, link?: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      title,
      message,
      link,
      is_read: false,
    } as any);

  if (error) {
    console.error('Failed to create internal notification:', error);
  }
}

export async function notifyOrderReady(orderId: string, userId?: string) {
  // Fetch order and customer data
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      customers (id, email, phone, full_name)
    `)
    .eq('id', orderId)
    .single();

  if (!order) return;

  const customer: any = order.customers;

  // 1. Internal notification for the user (staff/owner)
  if (userId) {
    await createInternalNotification(
      userId,
      order.tenant_id,
      'طلب جاهز للتسليم',
      `الطلب #${order.order_number} جاهز للتسليم.`
    );
  }

  // 2. Email to customer
  if (customer?.email) {
    await sendEmail(
      customer.email,
      'طلبك جاهز للتسليم',
      `<p>مرحباً ${customer.full_name},</p><p>طلبك رقم <strong>${order.order_number}</strong> جاهز للتسليم.</p>`
    );
  }

  // 3. SMS to customer
  if (customer?.phone) {
    await sendSMS(
      customer.phone,
      `طلبك رقم ${order.order_number} جاهز للتسليم من MJRH.`
    );
  }

  // 4. Log event
  await logEvent({
    event_type: 'EVT-009', // OrderReady
    tenant_id: order.tenant_id,
    order_id: orderId,
    payload: { notification_sent: true },
  });
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data;
}

export async function markAsRead(id: string) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
}
