export type LatLng = { lat: number; lng: number };

export function distanceKm(a?: LatLng | null, b?: LatLng | null) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function parseLatLng(input: string): LatLng | null {
  if (!input) return null;
  const s = decodeURIComponent(input.trim());
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

export function formatDistance(km: number | null | undefined) {
  if (km == null) return "—";
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

export function dueInfo(dueIso?: string | null) {
  if (!dueIso) return { label: "بدون موعد", late: false, minutes: null as number | null };
  const due = new Date(dueIso).getTime();
  if (!Number.isFinite(due)) return { label: "موعد غير صالح", late: false, minutes: null as number | null };
  const diffMin = Math.round((due - Date.now()) / 60000);
  const abs = Math.abs(diffMin);
  const unit = abs >= 60 ? `${Math.floor(abs / 60)}س ${abs % 60}د` : `${abs}د`;
  if (diffMin < 0) return { label: `متأخر ${unit}`, late: true, minutes: diffMin };
  return { label: `متبقي ${unit}`, late: false, minutes: diffMin };
}
