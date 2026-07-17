import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { autoAssignDrivers } from "@/lib/driver-assignment";
import { dueInfo, distanceKm } from "@/lib/geo";
import { orderTasksByNearestNeighbor, formatRouteSummary } from "@/lib/route-optimizer";
import { Truck, Package, MapPin, Navigation, RefreshCw, Route as RouteIcon, X, CheckSquare, Zap } from "lucide-react";
import { interpolate, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/live-map")({
  head: () => ({ meta: [{ title: "خريطة المراقبة الحية - MJRH" }] }),
  component: LiveMapPage,
});

type PinType = "pickup" | "delivery" | "driver";
type MapPin = {
  id: string; type: PinType; label: string; sublabel: string;
  address: string; lat?: number; lng?: number;
  status?: string; orderNumber?: number; dueLabel?: string; late?: boolean; pieces?: number; assignedTo?: string | null; source?: "pickup" | "order" | "driver"; sourceId?: string; coordKind?: "pickup" | "delivery";
};

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ", Egypt")}&limit=1`,
      { headers: { "Accept-Language": "ar" } }
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

function LeafletMap({ pins, selectedIds, onSelect, routeMode }: {
  pins: MapPin[]; selectedIds: Set<string>;
  onSelect: (id: string) => void; routeMode: boolean;
}) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initMap = async () => {
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }
      const L = (window as any).L;
      mapRef.current = L.map(containerRef.current!).setView([30.0444, 31.2357], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OSM</a>',
      }).addTo(mapRef.current);
    };
    initMap();
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    Object.values(markersRef.current).forEach((m: any) => m.remove?.());
    markersRef.current = {};

    const validPins = pins.filter((p) => p.lat && p.lng);
    validPins.forEach((pin) => {
      const isSelected = selectedIds.has(pin.id);
      const color = pin.type === "driver" ? "#8b5cf6" : pin.type === "pickup" ? "#f59e0b" : "#10b981";
      const sz = isSelected ? 46 : 36;
      const icon = L.divIcon({
        html: `<div style="width:${sz}px;height:${sz}px;background:${color};border:${isSelected ? "3px" : "2px"} solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isSelected ? "20px" : "16px"};box-shadow:${isSelected ? `0 0 0 4px ${color}44,` : ""}0 2px 8px rgba(0,0,0,.25);cursor:pointer"></div>`,
        iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], className: "",
      });
      const marker = L.marker([pin.lat!, pin.lng!], { icon })
        .addTo(mapRef.current)
        .bindPopup(`<div dir="rtl" style="font-family:sans-serif;min-width:160px"><b style="font-size:13px">${pin.label}</b>${pin.orderNumber ? `<div style="color:#666;font-size:11px">طلب #${pin.orderNumber}</div>` : ""}<div style="color:#888;font-size:11px;margin-top:4px">${pin.sublabel}</div><div style="color:#888;font-size:10px">${pin.address.slice(0, 45)}</div>${pin.status ? `<div style="margin-top:5px"><span style="background:${pin.late ? "#ef4444" : color};color:#fff;padding:1px 7px;border-radius:8px;font-size:10px">${pin.status}</span></div>` : ""}${pin.dueLabel ? `<div style="margin-top:4px;color:${pin.late ? "#dc2626" : "#666"};font-size:11px">${pin.dueLabel}</div>` : ""}${pin.pieces ? `<div style="color:#666;font-size:10px">قطع: ${pin.pieces}</div>` : ""}</div>`);
      marker.on("click", () => onSelect(pin.id));
      markersRef.current[pin.id] = marker;
    });

    if (routeMode && selectedIds.size >= 2) {
      const sel = validPins.filter((p) => selectedIds.has(p.id));
      // Maintain order of selection
      const orderedSel = [...selectedIds].map((id) => sel.find((p) => p.id === id)).filter(Boolean) as MapPin[];
      const toUse = orderedSel.length >= 2 ? orderedSel : sel;
      if (toUse.length >= 2) {
        const pl = L.polyline(toUse.map((p) => [p.lat!, p.lng!]), { color: "#0d9488", weight: 4, opacity: .85, dashArray: "10,6" }).addTo(mapRef.current);
        markersRef.current["__route__"] = pl;
        try { mapRef.current.fitBounds(pl.getBounds(), { padding: [50, 50] }); } catch {}
      }
    } else if (validPins.length) {
      try {
        const g = L.featureGroup(Object.values(markersRef.current).filter(Boolean));
        mapRef.current.fitBounds(g.getBounds(), { padding: [40, 40] });
      } catch {}
    }
  }, [pins, selectedIds, routeMode]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%", borderRadius: "12px" }} />;
}

function LiveMapPage() {
  const { hasRole, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const canView = hasRole("owner", "ops_manager");
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [routeMode, setRouteMode] = useState(false);
  const [stats, setStats] = useState({ pickups: 0, deliveries: 0, drivers: 0 });
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");
  const [optimizedInfo, setOptimizedInfo] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
    const raw: MapPin[] = [];
    const addBranch = (q: any) => branchId === "all" ? q : q.eq("branch_id", branchId);
    const [{ data: pickups }, { data: orders }, { data: drivers }, { data: branchRows }] = await Promise.all([
      addBranch(supabase.from("pickup_requests").select("id,branch_id,customer_name,address,phone,status,scheduled_at,lat,lng,estimated_pieces,driver_employee_id,converted_order_id")).in("status", ["pending", "assigned"]),
      addBranch(supabase.from("orders").select("id,branch_id,order_number,status,delivery_address,pickup_address,delivery_lat,delivery_lng,pickup_lat,pickup_lng,promised_delivery_at,is_urgent,assigned_driver_employee_id,customers(full_name,phone)")).in("status", ["received", "cleaning", "ironing", "packing", "ready", "out_for_delivery"]),
      addBranch(supabase.from("employees").select("id,branch_id,full_name,phone,current_lat,current_lng,location_updated_at").eq("job_role", "driver").eq("is_active", true)),
      tenantId ? supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at") : Promise.resolve({ data: [] }),
    ]);
    setBranches(branchRows ?? []);
    const openPickupOrderIds = new Set((pickups ?? []).map((p: any) => p.converted_order_id).filter(Boolean));
    const orderIds = (orders ?? []).map((o: any) => o.id);
    const pieceMap = new Map<string, number>();
    if (orderIds.length) {
      const { data: pieces } = await supabase.from("service_units").select("order_id,id").in("order_id", orderIds);
      (pieces ?? []).forEach((x: any) => pieceMap.set(x.order_id, (pieceMap.get(x.order_id) ?? 0) + 1));
    }
    (pickups ?? []).forEach((p: any) => {
      const due = dueInfo(p.scheduled_at);
      raw.push({ id: `p-${p.id}`, type: "pickup", label: p.customer_name, sublabel: p.phone, address: p.address, lat: p.lat ?? undefined, lng: p.lng ?? undefined, status: p.status === "pending" ? "بانتظار سائق" : "سائق في الطريق", dueLabel: due.label, late: due.late, pieces: p.estimated_pieces ?? 1, assignedTo: p.driver_employee_id, source: "pickup", sourceId: p.id, coordKind: "pickup" });
    });
    (orders ?? []).forEach((o: any) => {
      if (openPickupOrderIds.has(o.id)) return;
      const due = dueInfo(o.promised_delivery_at);
      const inPickupPhase = ["received", "cleaning", "ironing", "packing"].includes(o.status);
      const addr = inPickupPhase ? (o.pickup_address || o.delivery_address) : (o.delivery_address || o.pickup_address);
      if (!addr) return;
      const statusAr: Record<string, string> = { received: "تم الاستلام", cleaning: "في الغسيل", ironing: "في الكي", packing: "في التغليف", ready: "جاهز للتسليم", out_for_delivery: "خرج للتسليم" };
      raw.push({
        id: `${inPickupPhase ? "op" : "d"}-${o.id}`,
        type: inPickupPhase ? "pickup" : "delivery",
        label: o.customers?.full_name ?? "عميل",
        sublabel: o.customers?.phone ?? "",
        address: addr,
        lat: inPickupPhase ? (o.pickup_lat ?? o.delivery_lat ?? undefined) : (o.delivery_lat ?? o.pickup_lat ?? undefined),
        lng: inPickupPhase ? (o.pickup_lng ?? o.delivery_lng ?? undefined) : (o.delivery_lng ?? o.pickup_lng ?? undefined),
        orderNumber: o.order_number,
        status: statusAr[o.status] ?? o.status,
        dueLabel: due.label,
        late: due.late,
        pieces: pieceMap.get(o.id) ?? 1,
        assignedTo: o.assigned_driver_employee_id, source: "order", sourceId: o.id, coordKind: inPickupPhase ? "pickup" : "delivery",
      });
    });
    (drivers ?? []).forEach((d: any) => raw.push({ id: `dr-${d.id}`, type: "driver", label: d.full_name, sublabel: d.location_updated_at ? `آخر تحديث ${new Date(d.location_updated_at).toLocaleTimeString("ar-EG")}` : (d.phone ?? ""), address: "موقع السائق", lat: d.current_lat ?? undefined, lng: d.current_lng ?? undefined, source: "driver", sourceId: d.id }));
    setStats({ pickups: (pickups ?? []).length, deliveries: (orders ?? []).length, drivers: (drivers ?? []).length });
    setGeocoding(true);
    const geocoded = await Promise.all(raw.map(async (pin) => {
      if (pin.lat && pin.lng) return pin;
      if (pin.type === "driver") return pin;
      const c = await geocode(pin.address);
      if (c && pin.source === "pickup" && pin.sourceId) {
        await supabase.from("pickup_requests").update({ lat: c.lat, lng: c.lng }).eq("id", pin.sourceId).then(() => null);
      }
      if (c && pin.source === "order" && pin.sourceId) {
        const patch = pin.coordKind === "pickup" ? { pickup_lat: c.lat, pickup_lng: c.lng } : { delivery_lat: c.lat, delivery_lng: c.lng };
        await supabase.from("orders").update(patch).eq("id", pin.sourceId).then(() => null);
      }
      return c ? { ...pin, ...c } : pin;
    }));
    setGeocoding(false);
    setPins(geocoded);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تحميل الخريطة");
      setPins([]);
    } finally {
      setGeocoding(false);
      setLoading(false);
    }
  }, [branchId, tenantId]);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, [loadData]);

  async function runAutoAssign() {
    try {
      const r = await autoAssignDrivers();
      if (r.assigned) toast.success(r.message || `تم توزيع ${r.assigned} مهمة على ${r.drivers} مناديب`);
      else toast.error(r.message || "لا توجد مهام قابلة للتوزيع الآن");
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر توزيع المناديب");
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const selectedPins = [...selectedIds]
    .map((id) => pins.find((p) => p.id === id))
    .filter((p): p is MapPin => Boolean(p && p.lat && p.lng));

  function drawRoute() {
    if (selectedPins.length < 2) {
      toast.error("اختار نقطتين على الأقل من الخريطة أو القائمة لرسم خط السير");
      return;
    }
    setRouteMode(true);
    setOptimizedInfo(null);
    toast.success(`تم رسم خط السير بين ${selectedPins.length} نقاط`);
  }

  // NEW: Zero-cost route optimization via Haversine nearest-neighbor (no Google Directions API)
  function optimizeRoute() {
    if (selectedPins.length < 2) {
      toast.error("اختر نقطتين على الأقل لترتيب المسار");
      return;
    }
    // Use first driver location as origin if available, else first selected pin
    const driverPin = pins.find((p) => p.type === "driver" && p.lat && p.lng);
    const origin = driverPin ? { lat: driverPin.lat!, lng: driverPin.lng! } : { lat: selectedPins[0].lat!, lng: selectedPins[0].lng! };

    const tasks = selectedPins
      .filter((p) => p.type !== "driver")
      .map((p) => ({
        id: p.id,
        kind: p.type as any,
        loc: { lat: p.lat!, lng: p.lng! },
        address: p.address,
        customer_name: p.label,
        is_urgent: !!p.late,
      }));

    if (tasks.length < 2) {
      toast.error("تحتاج نقطتين توصيل/استلام على الأقل");
      return;
    }

    const { ordered, totalDistanceKm } = orderTasksByNearestNeighbor(origin, tasks as any);

    // Reorder selectedIds based on optimized order
    const newOrder = new Set<string>();
    // Keep driver pin first if was selected
    const driverSelected = [...selectedIds].filter((id) => pins.find((p) => p.id === id)?.type === "driver");
    driverSelected.forEach((id) => newOrder.add(id));
    ordered.forEach((t) => newOrder.add(t.id));

    setSelectedIds(newOrder);
    setRouteMode(true);
    setOptimizedInfo(formatRouteSummary(totalDistanceKm, ordered.length) + " — ترتيب تقريبي Zero-Cost (Haversine nearest-neighbor)، مش routing شوارع حقيقي — الـ Pro هيحتاج Google/Mapbox API مدفوع");
    toast.success(`تم ترتيب المسار: ${formatRouteSummary(totalDistanceKm, ordered.length)}`);
  }

  function openGoogleRoute() {
    if (selectedPins.length < 2) {
      toast.error("اختار نقطتين على الأقل لفتح خط السير في Google Maps");
      return;
    }
    const coords = selectedPins.map((p) => `${p.lat},${p.lng}`);
    const origin = coords[0];
    const destination = coords[coords.length - 1];
    const waypoints = coords.slice(1, -1).join("|");
    const url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function clearRoute() {
    setSelectedIds(new Set());
    setRouteMode(false);
    setOptimizedInfo(null);
  }

  if (!canView) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("map.accessDenied")}</CardContent></Card>;
  const noLocationPins = pins.filter((p) => p.type !== "driver" && (!p.lat || !p.lng));
  const driversNoLocation = pins.filter((p) => p.type === "driver" && (!p.lat || !p.lng));

  return (
    <div className="flex flex-col gap-3 min-h-[calc(100vh-7rem)]" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Navigation className="w-5 h-5 text-teal-600" />{t("map.title")}</h1>
          <p className="text-xs text-muted-foreground">{geocoding ? t("map.geocoding") : t("map.autoRefresh")}</p>
          {optimizedInfo && <p className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 rounded px-2 py-1 mt-1">{optimizedInfo}</p>}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {[["amber", `${t("map.pickup")} (${stats.pickups})`], ["green", `${t("map.delivery")} (${stats.deliveries})`], ["purple", `${t("map.drivers")} (${stats.drivers})`]].map(([c, l]) => (
            <span key={c} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full bg-${c}-500 inline-block`} />{l}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={branchId} onValueChange={setBranchId}><SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("map.allBranches")}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={drawRoute}>
            <RouteIcon className="w-3.5 h-3.5 ms-1" /> {t("map.drawRoute")} ({selectedPins.length})
          </Button>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={optimizeRoute}>
            <Zap className="w-3.5 h-3.5 me-1" /> ترتيب أقرب مسافة (Zero-Cost)
          </Button>
          <Button size="sm" variant="outline" onClick={openGoogleRoute}>Google Maps</Button>
          {selectedIds.size > 0 && <Button size="sm" variant="outline" onClick={clearRoute}><X className="w-3.5 h-3.5" /></Button>}
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={runAutoAssign}>{t("map.assignCouriers")}</Button>
          <Button size="sm" variant="outline" onClick={loadData}><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {!routeMode && pins.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs text-teal-700 flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
          {t("map.routeHint")} — الجديد: زر "ترتيب أقرب مسافة" يستخدم Haversine (رياضيات مجانية، لا Google Directions API) لترتيب نقاط اليوم بأقرب مسافة — تحسين ملموس بتكلفة صفر، والـ routing الحقيقي بمسارات شوارع مؤجل لـ Pro.
        </div>
      )}

      {(noLocationPins.length > 0 || driversNoLocation.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          {noLocationPins.length > 0 && <div>{interpolate(t("map.noLocationWarning"), { count: noLocationPins.length })}</div>}
          {driversNoLocation.length > 0 && <div>{interpolate(t("map.driverNoLocationWarning"), { count: driversNoLocation.length })}</div>}
        </div>
      )}

      {selectedPins.length > 0 && (
        <div className="rounded-2xl border bg-white/80 backdrop-blur px-3 py-2 text-xs text-slate-700 flex flex-wrap items-center gap-2">
          <span className="font-black text-teal-700">{t("map.selectedPoints")}</span>
          {selectedPins.map((p, i) => <Badge key={p.id} variant="secondary">{i + 1}. {p.label}</Badge>)}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-3 flex-1 min-h-0">
        <div className="rounded-3xl overflow-hidden border shadow bg-white min-h-[48vh] md:min-h-[58vh] xl:min-h-0 xl:h-[calc(100vh-17rem)]">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[48vh] flex-col gap-3">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">{t("map.loading")}</p>
            </div>
          ) : (
            <LeafletMap pins={pins} selectedIds={selectedIds} onSelect={toggle} routeMode={routeMode} />
          )}
        </div>

        <div className="overflow-y-auto space-y-3 shrink-0 max-h-[46vh] xl:max-h-[calc(100vh-17rem)] rounded-3xl border bg-white/70 backdrop-blur p-3">
          {(["pickup", "delivery", "driver"] as PinType[]).map((type) => {
            const group = pins.filter((p) => p.type === type);
            if (!group.length) return null;
            const meta = { pickup: { label: t("map.pickup"), color: "amber", icon: Package }, delivery: { label: t("map.delivery"), color: "emerald", icon: MapPin }, driver: { label: t("map.drivers"), icon: Truck, color: "purple" } }[type]!;
            return (
              <div key={type}>
                <div className={`text-xs font-bold text-${meta.color}-600 uppercase tracking-wide mb-1 flex items-center gap-1`}>
                  <meta.icon className="w-3 h-3" />{meta.label}
                </div>
                {group.map((pin) => (
                  <div key={pin.id} onClick={() => toggle(pin.id)}
                    className={`border rounded-lg p-2 mb-1 cursor-pointer text-xs transition-all ${selectedIds.has(pin.id) ? `bg-${meta.color}-100 border-${meta.color}-400 shadow-sm` : "bg-white hover:shadow-sm"}`}>
                    <div className="font-bold truncate">{pin.label}</div>
                    {pin.orderNumber && <div className="text-muted-foreground">#{pin.orderNumber}</div>}
                    <div className="text-muted-foreground truncate">{pin.address.slice(0, 30)}</div>
                    {pin.dueLabel && <div className={pin.late ? "text-red-600 font-bold" : "text-muted-foreground"}>{pin.dueLabel}</div>}
                    {pin.pieces && <div className="text-muted-foreground">{t("map.pieces")}: {pin.pieces}</div>}
                    {!pin.lat && <div className="text-amber-500 mt-0.5">{t("map.unknownLocation")}</div>}
                    {selectedIds.has(pin.id) && <div className="text-teal-600 font-bold flex items-center gap-1 mt-1"><CheckSquare className="w-3 h-3" />{t("map.selectedNumber")} {[...selectedIds].indexOf(pin.id) + 1}</div>}
                  </div>
                ))}
              </div>
            );
          })}
          {!loading && pins.length === 0 && <div className="text-center text-xs text-muted-foreground p-6">{t("map.noActive")}</div>}
        </div>
      </div>
    </div>
  );
}
