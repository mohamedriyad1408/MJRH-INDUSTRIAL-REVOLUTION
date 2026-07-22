import { supabase } from '@/integrations/supabase/client';
import { logEvent } from './event-logger';

// ============================================
// T-029: Payment Gateways Integration
// ============================================

export async function processFawryPayment(orderId: string, amount: number, customerMobile: string) {
  try {
    // Placeholder for Fawry API call
    console.log(`Processing Fawry payment for order ${orderId}, amount ${amount}`);
    
    // In a real scenario, we would call Fawry's endpoint here
    // const apiKey = import.meta.env.VITE_FAWRY_API_KEY;
    
    return { 
      success: true, 
      transactionId: `FAW-${Date.now()}`, 
      paymentUrl: `https://fawry.com/pay?id=${orderId}` 
    };
  } catch (error) {
    console.error('Fawry payment error:', error);
    return { success: false, error: 'فشل معالجة الدفع عبر فوري' };
  }
}

export async function processVodafoneCashPayment(orderId: string, amount: number, customerPhone: string) {
  try {
    // Placeholder for Vodafone Cash / Paymob integration
    console.log(`Processing Vodafone Cash payment for order ${orderId}, amount ${amount}`);
    
    return { 
      success: true, 
      transactionId: `VC-${Date.now()}`, 
      status: 'PENDING' 
    };
  } catch (error) {
    console.error('Vodafone Cash payment error:', error);
    return { success: false, error: 'فشل معالجة الدفع عبر فودافون كاش' };
  }
}

export async function processCardPayment(orderId: string, amount: number, cardToken: string) {
  try {
    // Placeholder for Stripe / Paymob Card integration
    console.log(`Processing Card payment for order ${orderId}, amount ${amount}`);
    
    return { 
      success: true, 
      transactionId: `CARD-${Date.now()}`, 
      status: 'succeeded' 
    };
  } catch (error) {
    console.error('Card payment error:', error);
    return { success: false, error: 'فشل معالجة الدفع عبر البطاقة' };
  }
}

export async function updatePaymentStatus(orderId: string, transactionId: string, status: 'PAID' | 'FAILED' | 'PENDING', method: string) {
  // 1. Update order payment status
  const { error: orderError } = await supabase
    .from('orders')
    .update({ 
      payment_status: status === 'PAID' ? 'paid' : 'unpaid'
    })
    .eq('id', orderId);

  if (orderError) {
    console.error('Failed to update order payment status:', orderError);
    return { success: false, error: 'فشل تحديث حالة الطلب' };
  }

  // 2. Insert record into payments table
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      amount: 0, // Should be fetched from order total in real logic
      payment_method: method,
      reference_number: transactionId,
      status: status === 'PAID' ? 'completed' : 'failed',
      created_at: new Date().toISOString()
    } as any);

  if (paymentError) {
    console.error('Failed to insert payment record:', paymentError);
  }

  // 3. Log event
  if (status === 'PAID') {
    await logEvent({
      event_type: 'EVT-012', // PaymentCollected
      tenant_id: 'pending-fetch', // Should fetch from order
      order_id: orderId,
      payload: { transactionId, method },
    });
  }

  return { success: true };
}
