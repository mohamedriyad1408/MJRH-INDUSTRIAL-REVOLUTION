import { distanceKm, type LatLng } from "@/lib/geo";

export type RouteTask = {
  id: string;
  kind: "pickup" | "delivery";
  loc: LatLng;
  address?: string | null;
  customer_name?: string | null;
  is_urgent?: boolean;
  total?: number;
};

// Haversine nearest-neighbor (zero-cost, no Google Directions API)
// تقريبي: يرتب نقاط اليوم بأقرب مسافة مباشرة من موقع السائق الحالي، مش مسار شوارع حقيقي
export function orderTasksByNearestNeighbor(
  driverLoc: LatLng | null,
  tasks: RouteTask[]
): { ordered: RouteTask[]; totalDistanceKm: number; steps: { from: LatLng | null; to: RouteTask; distanceKm: number | null }[] } {
  if (!driverLoc || tasks.length === 0) {
    return { ordered: tasks, totalDistanceKm: 0, steps: [] };
  }

  const remaining = [...tasks];
  const ordered: RouteTask[] = [];
  const steps: { from: LatLng | null; to: RouteTask; distanceKm: number | null }[] = [];
  let current: LatLng | null = driverLoc;
  let total = 0;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist: number | null = null;
    let min = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = distanceKm(current, remaining[i].loc);
      const dist = d ?? 99999;
      if (dist < min) {
        min = dist;
        nearestIdx = i;
        nearestDist = d;
      }
    }

    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next);
    steps.push({ from: current, to: next, distanceKm: nearestDist });
    total += nearestDist ?? 0;
    current = next.loc;
  }

  return { ordered, totalDistanceKm: total, steps };
}

export function formatRouteSummary(totalKm: number, taskCount: number) {
  if (taskCount === 0) return "لا توجد مهام";
  if (totalKm < 1) return `${taskCount} مهمة • ${Math.round(totalKm * 1000)} م تقريبي`;
  return `${taskCount} مهمة • ${totalKm.toFixed(1)} كم تقريبي (Haversine)`;
}
