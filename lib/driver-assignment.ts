import { supabase } from "@/integrations/supabase/client";
import { distanceKm, type LatLng } from "@/lib/geo";

type DriverLoad = {
  id: string;
  full_name: string;
  loc: LatLng | null;
  tasks: number;
  pieces: number;
  urgent: number;
  distance: number;
  score: number;
};

type AssignableTask = {
  id: string;
  kind: "pickup" | "delivery";
  loc: LatLng | null;
  pieces: number;
  urgent: boolean;
  dueAt?: string | null;
};

function taskWeight(t: AssignableTask) {
  const duePenalty = t.dueAt && new Date(t.dueAt).getTime() < Date.now() ? 4 : 0;
  return 3 + t.pieces * 0.45 + (t.urgent ? 3 : 0) + duePenalty;
}

function loadScore(l: DriverLoad) {
  return l.tasks * 3 + l.pieces * 0.45 + l.urgent * 2 + l.distance * 1.2;
}

function assignmentScore(driver: DriverLoad, task: AssignableTask) {
  const dist = distanceKm(driver.loc, task.loc);
  const noDriverLocationPenalty = driver.loc ? 0 : 10;
  const noTaskLocationPenalty = task.loc ? 0 : 30;
  return loadScore(driver) + (dist ?? 8) * 1.7 + noDriverLocationPenalty + noTaskLocationPenalty + taskWeight(task);
}

async function pieceCountsByOrder(orderIds: string[]) {
  const out = new Map<string, number>();
  if (!orderIds.length) return out;
  const { data } = await (supabase as any).from("service_units").select("order_id,id").in("order_id", orderIds);
  (data ?? []).forEach((r: any) => out.set(r.order_id, (out.get(r.order_id) ?? 0) + 1));
  return out;
}

export async function autoAssignDrivers() {
  const [{ data: drivers, error: dErr }, { data: pickups }, { data: deliveries }, { data: activePickups }, { data: activeDeliveries }] = await Promise.all([
    supabase
      .from("employees")
      .select("id,full_name,current_lat,current_lng")
      .eq("is_active", true)
      .eq("job_role", "driver"),
    (supabase as any).from("pickup_requests").select("id,lat,lng,scheduled_at,status").eq("status", "pending"),
    (supabase as any).from("orders").select("id,is_urgent,delivery_lat,delivery_lng,promised_delivery_at,status").eq("status", "ready").is("assigned_driver_employee_id", null),
    (supabase as any).from("pickup_requests").select("id,driver_employee_id,lat,lng").eq("status", "assigned").not("driver_employee_id", "is", null),
    (supabase as any).from("orders").select("id,assigned_driver_employee_id,delivery_lat,delivery_lng,is_urgent").in("status", ["ready", "out_for_delivery"]).not("assigned_driver_employee_id", "is", null),
  ]);
  if (dErr) throw dErr;

  const ds = (drivers ?? []) as any[];
  const deliveryIds = [...(deliveries ?? []), ...(activeDeliveries ?? [])].map((o: any) => o.id);
  const pieceMap = await pieceCountsByOrder(deliveryIds);

  const tasks: AssignableTask[] = [
    ...(pickups ?? []).map((p: any) => ({ id: p.id, kind: "pickup" as const, loc: p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : null, pieces: 1, urgent: false, dueAt: p.scheduled_at })),
    ...(deliveries ?? []).map((o: any) => ({ id: o.id, kind: "delivery" as const, loc: o.delivery_lat && o.delivery_lng ? { lat: Number(o.delivery_lat), lng: Number(o.delivery_lng) } : null, pieces: pieceMap.get(o.id) ?? 1, urgent: Boolean(o.is_urgent), dueAt: o.promised_delivery_at })),
  ];

  const totalTasks = tasks.length;
  const noLocationTasks = tasks.filter((t) => !t.loc).length;
  const assignableTasks = tasks.filter((t) => t.loc);

  if (!totalTasks) return { assigned: 0, drivers: ds.length, tasks: 0, blockedNoLocation: 0, message: "لا توجد مهام مفتوحة للتوزيع الآن" };
  if (!ds.length) return { assigned: 0, drivers: 0, tasks: totalTasks, blockedNoLocation: noLocationTasks, message: `يوجد ${totalTasks} مهمة لكن لا يوجد مندوب نشط. أضف مندوب أو فعّل مندوب من الموظفين.` };
  if (!assignableTasks.length) return { assigned: 0, drivers: ds.length, tasks: totalTasks, blockedNoLocation: noLocationTasks, message: `يوجد ${totalTasks} مهمة لكنها بلا موقع واضح. سجل موقع العميل أو العنوان أولًا.` };

  const loads = new Map<string, DriverLoad>();
  ds.forEach((d) => loads.set(d.id, {
    id: d.id,
    full_name: d.full_name,
    loc: d.current_lat && d.current_lng ? { lat: Number(d.current_lat), lng: Number(d.current_lng) } : null,
    tasks: 0,
    pieces: 0,
    urgent: 0,
    distance: 0,
    score: 0,
  }));

  (activePickups ?? []).forEach((p: any) => {
    const l = loads.get(p.driver_employee_id); if (!l) return;
    l.tasks += 1;
    const taskLoc = p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : null;
    l.distance += distanceKm(l.loc, taskLoc) ?? 0;
  });
  (activeDeliveries ?? []).forEach((o: any) => {
    const l = loads.get(o.assigned_driver_employee_id); if (!l) return;
    l.tasks += 1;
    l.pieces += pieceMap.get(o.id) ?? 1;
    if (o.is_urgent) l.urgent += 1;
    const taskLoc = o.delivery_lat && o.delivery_lng ? { lat: Number(o.delivery_lat), lng: Number(o.delivery_lng) } : null;
    l.distance += distanceKm(l.loc, taskLoc) ?? 0;
  });

  assignableTasks.sort((a, b) => taskWeight(b) - taskWeight(a));
  let assigned = 0;
  for (const t of assignableTasks) {
    const chosen = [...loads.values()].sort((a, b) => assignmentScore(a, t) - assignmentScore(b, t))[0];
    if (!chosen) continue;
    if (t.kind === "pickup") {
      const { error } = await (supabase as any).from("pickup_requests").update({ driver_employee_id: chosen.id, status: "assigned" }).eq("id", t.id);
      if (error) throw error;
    } else {
      const { error } = await (supabase as any).from("orders").update({ assigned_driver_employee_id: chosen.id }).eq("id", t.id);
      if (error) throw error;
    }
    chosen.tasks += 1;
    chosen.pieces += t.pieces;
    if (t.urgent) chosen.urgent += 1;
    chosen.distance += distanceKm(chosen.loc, t.loc) ?? 0;
    assigned += 1;
  }

  const blocked = totalTasks - assigned;
  const message = assigned
    ? `تم توزيع ${assigned} من ${totalTasks} مهمة على ${ds.length} مندوب${blocked ? `، وباقي ${blocked} بلا موقع واضح` : ""}`
    : (noLocationTasks ? `لم يتم التوزيع: ${noLocationTasks} مهمة بلا موقع واضح` : "لا توجد مهام قابلة للتوزيع الآن");

  return { assigned, drivers: ds.length, tasks: totalTasks, blockedNoLocation: noLocationTasks, message };
}
