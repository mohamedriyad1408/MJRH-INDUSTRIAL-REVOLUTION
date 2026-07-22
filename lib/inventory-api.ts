// ============================================
// T-017: Inventory Management API
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { logEvent } from './event-logger';

export interface InventoryItem {
  id: string;
  tenant_id: string;
  supplier_id?: string;
  name: string;
  category: string;
  sku: string;
  quantity: number;
  unit: string;
  min_quantity?: number;
  max_quantity?: number;
  cost_per_unit?: number;
  location?: string;
  status: 'active' | 'low_stock' | 'out_of_stock' | 'discontinued';
  last_restocked_at?: string;
}

export interface InventoryTransaction {
  inventory_id: string;
  type: 'restock' | 'consume' | 'adjustment' | 'return';
  quantity: number;
  notes?: string;
  order_id?: string;
}

export async function getSuppliers(tenantId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
    return (data || []) as any[];
}

export async function createSupplier(tenantId: string, item: any): Promise<void> {
    await supabase.from('suppliers').insert({ ...item, tenant_id: tenantId });
}

export async function updateSupplier(id: string, item: any): Promise<void> {
    await supabase.from('suppliers').update(item).eq('id', id);
}

export async function deleteSupplier(id: string): Promise<void> {
    await supabase.from('suppliers').delete().eq('id', id);
}

export async function getInventory(tenantId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch inventory:', error);
    return [];
  }

  return (data || []) as any[];
}

export async function getLowStockItems(tenantId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('tenant_id', tenantId)
    .lt('quantity', 'min_quantity')
    .in('status', ['active', 'low_stock']);

  if (error) {
    console.error('Failed to fetch low stock items:', error);
    return [];
  }

  return (data || []) as any[];
}

export async function createInventoryItem(
  tenantId: string,
  item: Omit<InventoryItem, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: InventoryItem; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .insert({ ...item, tenant_id: tenantId })
      .select()
      .single();

    if (error) {
      console.error('Failed to create inventory item:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as any };
  } catch (error) {
    console.error('Unexpected error in createInventoryItem:', error);
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
}

export async function updateInventoryQuantity(
  inventoryId: string,
  transaction: InventoryTransaction
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. جلب العنصر الحالي
    const { data: item, error: fetchError } = await supabase
      .from('inventory')
      .select('id, quantity, name, tenant_id, min_quantity')
      .eq('id', inventoryId)
      .single();

    if (fetchError || !item) {
      return { success: false, error: 'العنصر غير موجود' };
    }

    // 2. حساب الكمية الجديدة
    const newQuantity = Number(item.quantity) + transaction.quantity;

    if (newQuantity < 0) {
      return { success: false, error: 'الكمية المطلوبة غير متوفرة' };
    }

    // 3. تحديث الكمية
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        quantity: newQuantity,
        status: newQuantity === 0 ? 'out_of_stock' : newQuantity < (item.min_quantity || 0) ? 'low_stock' : 'active',
        updated_at: new Date().toISOString(),
        last_restocked_at: transaction.type === 'restock' ? new Date().toISOString() : undefined,
      } as any)
      .eq('id', inventoryId);

    if (updateError) {
      console.error('Failed to update inventory:', updateError);
      return { success: false, error: updateError.message };
    }

    // 4. تسجيل الحركة
    const { error: transError } = await supabase.from('inventory_transactions').insert({
      inventory_id: inventoryId,
      type: transaction.type,
      quantity: transaction.quantity,
      previous_quantity: item.quantity,
      new_quantity: newQuantity,
      notes: transaction.notes,
      order_id: transaction.order_id,
    } as any);

    if (transError) {
      console.error('Failed to log transaction:', transError);
    }

    // 5. تسجيل حدث
    await logEvent({
      event_type: `INVENTORY_${transaction.type.toUpperCase()}` as any,
      tenant_id: item.tenant_id,
      payload: {
        inventory_id: inventoryId,
        item_name: item.name,
        quantity: transaction.quantity,
        new_quantity: newQuantity,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateInventoryQuantity:', error);
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
}
