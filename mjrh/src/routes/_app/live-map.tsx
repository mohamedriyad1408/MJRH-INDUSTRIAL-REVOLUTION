import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Truck, Package, MapPin, Navigation, RefreshCw, Route, X, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/_app/live-map")({
  head: () => ({ meta: [{ title: "خريطة المراقبة الحية - MJRH" }] }),
  component: LiveMapPage,
});

type PinType = "pickup" | "delivery" | "driver";
type MapPin = {
  id: string; type: PinType; label: string; sublabel: string;
  address: string; lat?: number; lng?: number;
  status?: string; orderNumber?: number;
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
      const emoji = pin.type === "driver" ? "🚗" : pin.type === "pickup" ? "📦" : "🏠";
      const sz = isSelected ? 46 : 36;
      const icon = L.divIcon({
        html: `<div style="width:${sz}px;height:${sz}px;background:${color};border:${isSelected ? "3px" : "2px"} solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isSelected ? "20px" : "16px"};box-shadow:${isSelected ? `0 0 0 4px ${color}44,` : ""}0 2px 8px rgba(0,0,0,.25);cursor:pointer">${emoji}</div>`,
        iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], className: "",
      });
      const marker = L.marker([pin.lat!, pin.lng!], { icon })
        .addTo(mapRef.current)
        .bindPopup(`<div dir="rtl" style="font-family:sans-serif;min-width:150px"><b style="font-size:13px">${pin.label}</b>${pin.orderNumber ? `<div style="color:#666;font-size:11px">طلب #${pin.orderNumber}</div>` : ""}<div style="color:#888;font-size:11px;margin-top:4px">${pin.sublabel}</div><div style="color:#888;font-size:10px">📍 ${pin.address.slice(0, 45)}</div>${pin.status ? `<div style="margin-top:5px"><span style="background:${color};color:#fff;padding:1px 7px;border-radius:8px;font-size:10px">${pin.status}</span></div>` : ""}</div>`);
      marker.on("click", () => onSelect(pin.id));
      markersRef.current[pin.id] = marker;
    });

    if (routeMode && selectedIds.size >= 2) {
      const sel = validPins.filter((p) => selectedIds.has(p.id));
      if (sel.length >= 2) {
        const pl = L.polyline(sel.map((p) => [p.lat!, p.lng!]), { color: "#0d9488", weight: 4, opacity: .85, dashArray: "10,6" }).addTo(mapRef.current);
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
  const { hasRole } = useAuth();
  const canView = hasRole("owner", "ops_manager");
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [routeMode, setRouteMode] = useState(false);
  const [stats, setStats] = useState({ pickups: 0, deliveries: 0, drivers: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    const raw: MapPin[] = [];

    const [{ data: pickups }, { data: orders }, { data: drivers }] = await Promise.all([
      supabase.from("pickup_requests").select("id,customer_name,address,phone,status").in("status", ["pending", "assigned"]),
      supabase.from("orders").select("id,order_number,status,delivery_address,pickup_address,customers(full_name,phone)").in("status", ["ready", "out_for_delivery"]),
      supabase.from("employees").select("id,full_name,phone").eq("job_role", "courier").eq("is_active", true),
    ]);

    (pickups ?? []).forEach((p: any) => raw.push({ id: `p-${p.id}`, type: "pickup", label: p.customer_name, sublabel: p.phone, address: p.address, status: p.status === "pending" ? "بانتظار سائق" : "سائق في الطريق" }));
    (orders ?? []).forEach((o: any) => { const addr = o.delivery_address || o.pickup_address; if (!addr) return; raw.push({ id: `d-${o.id}`, type: "delivery", label: o.customers?.full_name ?? "عميل", sublabel: o.customers?.phone ?? "", address: addr, orderNumber: o.order_number, status: o.status === "ready" ? "جاهز" : "خرج للتسليم" }); });
    (drivers ?? []).forEach((d: any) => raw.push({ id: `dr-${d.id}`, type: "driver", label: d.full_name, sublabel: d.phone ?? "", address: "موقع السائق" }));

    setStats({ pickups: (pickups ?? []).length, deliveries: (orders ?? []).length, drivers: (drivers ?? []).length });
    setGeocoding(true);
    const geocoded = await Promise.all(raw.map(async (pin) => {
      if (pin.lat && pin.lng) return pin;
      const c = await geocode(pin.address);
      return c ? { ...pin, ...c } : pin;
    }));
    setGeocoding(false);
    setPins(geocoded);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, [loadData]);

  function toggle(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  if (!canView) return <Card><CardContent className="p-10 text-center text-muted-foreground">للمالك ومدير التشغيل فقط.</CardContent></Card>;

  return (
    <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 110px)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Navigation className="w-5 h-5 text-teal-600" />خريطة المراقبة الحية</h1>
          <p className="text-xs text-muted-foreground">{geocoding ? "⏳ تحديد المواقع..." : "تحديث تلقائي كل 30 ث"}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {[["amber", `📦 استلام (${stats.pickups})`], ["green", `🏠 توصيل (${stats.deliveries})`], ["purple", `🚗 سائقين (${stats.drivers})`]].map(([c, l]) => (
            <span key={c} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full bg-${c}-500 inline-block`} />{l}</span>
          ))}
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && <>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { if (selectedIds.size < 2) { toast.error("اختر نقطتين على الأقل"); return; } setRouteMode(true); toast.success(`خط سير لـ ${selectedIds.size} نقاط`); }}>
              <Route className="w-3.5 h-3.5 ms-1" /> رسم خط السير ({selectedIds.size})
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setSelectedIds(new Set()); setRouteMode(false); }}><X className="w-3.5 h-3.5" /></Button>
          </>}
          <Button size="sm" variant="outline" onClick={loadData}><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {!routeMode && pins.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs text-teal-700 flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
          اضغط على نقطة في الخريطة أو القائمة لتحديدها، ثم اضغط "رسم خط السير"
        </div>
      )}

      <div className="flex gap-3 flex-1 min-h-0">
        <div className="flex-1 rounded-xl overflow-hidden border shadow bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full flex-col gap-3">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">جاري تحميل الخريطة...</p>
            </div>
          ) : (
            <LeafletMap pins={pins} selectedIds={selectedIds} onSelect={toggle} routeMode={routeMode} />
          )}
        </div>

        <div className="w-56 overflow-y-auto space-y-3 shrink-0">
          {(["pickup", "delivery", "driver"] as PinType[]).map((type) => {
            const group = pins.filter((p) => p.type === type);
            if (!group.length) return null;
            const meta = { pickup: { label: "استلام", color: "amber", icon: Package }, delivery: { label: "توصيل", color: "emerald", icon: MapPin }, driver: { label: "سائقين", icon: Truck, color: "purple" } }[type]!;
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
                    {!pin.lat && <div className="text-amber-500 mt-0.5">⚠ موقع غير محدد</div>}
                    {selectedIds.has(pin.id) && <div className="text-teal-600 font-bold flex items-center gap-1 mt-1"><CheckSquare className="w-3 h-3" />محدد</div>}
                  </div>
                ))}
              </div>
            );
          })}
          {!loading && pins.length === 0 && <div className="text-center text-xs text-muted-foreground p-6">لا توجد حركة نشطة الآن</div>}
        </div>
      </div>
    </div>
  );
}
