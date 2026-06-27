import { supabase } from "@/integrations/supabase/client";

export async function autoAssignIroningPieces(orderId: string) {
  const { data, error } = await (supabase as any).rpc("rebalance_ironing_assignments", {
    _order_id: orderId,
    _tenant_id: null,
    _branch_id: null,
  });
  if (error) throw error;
  return {
    assigned: Number(data?.assigned ?? 0),
    employees: Number(data?.employees ?? 0),
    message: data?.message as string | undefined,
  };
}
