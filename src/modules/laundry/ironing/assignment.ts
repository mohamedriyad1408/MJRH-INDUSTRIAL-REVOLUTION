import { supabase } from "@/integrations/supabase/client";

export async function autoAssignIroningPieces(orderId: string) {
  const { data, error } = await supabase.rpc("rebalance_ironing_assignments", {
    _order_id: orderId,
    _tenant_id: undefined,
    _branch_id: undefined,
  });
  if (error) throw error;
  return {
    assigned: Number((data as any)?.assigned ?? 0),
    employees: Number((data as any)?.employees ?? 0),
    message: (data as any)?.message as string | undefined,
  };
}
