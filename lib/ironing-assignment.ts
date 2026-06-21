import { supabase } from "@/integrations/supabase/client";

type IroningEmployeeLoad = {
  id: string;
  full_name: string;
  pieces: number;
  shirtLike: number;
  value: number;
};

type ServiceUnitForAssignment = {
  id: string;
  name: string;
  garment_type?: string | null;
  is_shirt_like?: boolean | null;
  line_value?: number | null;
  unit_price?: number | null;
};

function isShirtLike(u: ServiceUnitForAssignment) {
  const text = `${u.name ?? ""} ${u.garment_type ?? ""}`.toLowerCase();
  return Boolean(u.is_shirt_like) || /قميص|بلوز|shirt|blouse/.test(text);
}

function unitValue(u: ServiceUnitForAssignment) {
  return Number(u.line_value ?? u.unit_price ?? 0);
}

function loadScore(load: IroningEmployeeLoad) {
  // Low-cost practical fairness: pieces first, then shirts/blouses, then invoice value.
  // The value is scaled so it helps balance expensive orders without dominating count fairness.
  return load.pieces * 100 + load.shirtLike * 65 + load.value * 0.7;
}

export async function autoAssignIroningPieces(orderId: string) {
  const { data: employees, error: eErr } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("is_active", true)
    .or("station.eq.ironing,job_role.eq.ironing_tech");
  if (eErr) throw eErr;
  const emps = (employees ?? []) as { id: string; full_name: string }[];
  if (!emps.length) return { assigned: 0, employees: 0 };

  const { data: units, error: uErr } = await (supabase as any)
    .from("service_units")
    .select("id,name,garment_type,is_shirt_like,line_value,unit_price,assigned_ironing_employee_id")
    .eq("order_id", orderId)
    .is("assigned_ironing_employee_id", null)
    .in("service_type", ["ironing", "both"])
    .order("unit_number");
  if (uErr) throw uErr;
  const pending = (units ?? []) as ServiceUnitForAssignment[];
  if (!pending.length) return { assigned: 0, employees: emps.length };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayUnits } = await (supabase as any)
    .from("service_units")
    .select("assigned_ironing_employee_id,is_shirt_like,line_value,unit_price")
    .not("assigned_ironing_employee_id", "is", null)
    .gte("ironing_assigned_at", today.toISOString());

  const loads = new Map<string, IroningEmployeeLoad>();
  emps.forEach((e) => loads.set(e.id, { id: e.id, full_name: e.full_name, pieces: 0, shirtLike: 0, value: 0 }));
  ((todayUnits ?? []) as any[]).forEach((u) => {
    const l = loads.get(u.assigned_ironing_employee_id);
    if (!l) return;
    l.pieces += 1;
    if (u.is_shirt_like) l.shirtLike += 1;
    l.value += Number(u.line_value ?? u.unit_price ?? 0);
  });

  // Assign heavier / shirt-like units first to smooth distribution.
  const sorted = [...pending].sort((a, b) => {
    const av = (isShirtLike(a) ? 1000 : 0) + unitValue(a);
    const bv = (isShirtLike(b) ? 1000 : 0) + unitValue(b);
    return bv - av;
  });

  const updates: { id: string; employeeId: string }[] = [];
  for (const u of sorted) {
    const chosen = [...loads.values()].sort((a, b) => loadScore(a) - loadScore(b))[0];
    if (!chosen) continue;
    updates.push({ id: u.id, employeeId: chosen.id });
    chosen.pieces += 1;
    if (isShirtLike(u)) chosen.shirtLike += 1;
    chosen.value += unitValue(u);
  }

  for (const up of updates) {
    const { error } = await (supabase as any)
      .from("service_units")
      .update({ assigned_ironing_employee_id: up.employeeId, ironing_assigned_at: new Date().toISOString() })
      .eq("id", up.id);
    if (error) throw error;
  }

  return { assigned: updates.length, employees: emps.length };
}
