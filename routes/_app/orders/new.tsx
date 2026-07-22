import { Row } from "@/components/new-order-components";
import { interpolate, useI18n } from "@/lib/i18n";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { parseLatLng } from "@/lib/geo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, Trash2, ArrowRight, LocateFixed, Search, Sparkles,
  Shirt, Package, Scissors, Truck, Receipt, CreditCard, Zap, Plus, Minus,
} from "lucide-react";
import { createOrder } from "@/lib/orders-api";

export const Route = createFileRoute("/_app/orders/new")({
  head: () => ({ meta: [{ title: "New Order - MJRH" }] }),
  component: NewOrderPage,
});

type Service = { id: string; name: string; service_type: string; unit_price: number; is_active: boolean };
type ServiceArea = { id: string; name: string; area_type: string; lat: number | null; lng: number | null; default_delivery_fee: number; aliases?: string[] | null };
type Customer = { id: string; full_name: string; phone: string; address?: string | null; lat?: number | null; lng?: number | null; location_url?: string | null };
type LineItem = { service_item_id: string; name: string; service_type: string; qty: number; unit_price: number };

type ServiceFilter = "all" | "cleaning" | "ironing" | "both";

function isShirtLikeName(name: string) {
  return /قميص|بلوز|shirt|blouse/i.test(name);
}

function complexityForName(name: string) {
  if (/فستان/i.test(name)) return 8;
  if (/بدلة/i.test(name)) return 5;
  if (/معطف/i.test(name)) return 4;
  if (/عباية|جاكيت/i.test(name)) return 3;
  if (/قميص|بنطلون|بلوز|جيبة/i.test(name)) return 2;
  return 1;
}

function phoneDigits(v: string) { return (v || "").replace(/\D/g, ""); }

const FILTERS: { id: ServiceFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all", label: "all", icon: Sparkles },
  { id: "cleaning", label: "repair", icon: Scissors },
  { id: "ironing", label: "ironing", icon: Shirt },
  { id: "both", label: "washIron", icon: Package },
];

function NewOrderPage() {
  const { t, dir } = useI18n();
  const { hasRole, user, tenantId } = useAuth();
  const [employeeStation, setEmployeeStation] = useState<string | null>(null);
  const [employeeBranchId, setEmployeeBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("");
  const canCreate = hasRole("cs_manager", "owner") || employeeStation === "reception";
  const nav = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [settings, setSettings] = useState<{ urgent_service_fee: number; default_delivery_fee: number; tax_percent: number }>({ urgent_service_fee: 0, default_delivery_fee: 0, tax_percent: 0 });

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerMatches, setCustomerMatches] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", address: "" });

  const [items, setItems] = useState<LineItem[]>([]);
  const [orderType, setOrderType] = useState<"walk_in" | "delivery">("walk_in");
  const [isUrgent, setIsUrgent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid");
  const [discountPct, setDiscountPct] = useState("0");
  const [urgentFeeInput, setUrgentFeeInput] = useState("0");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupLoc, setPickupLoc] = useState({ lat: "", lng: "" });
  const [deliveryLoc, setDeliveryLoc] = useState({ lat: "", lng: "" });
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [serviceSearch, setServiceSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("employees").select("station,branch_id,profile_id,email").or(`profile_id.eq.${user.id},email.eq.${user.email}`).maybeSingle().then(({ data }: any) => { setEmployeeStation(data?.station ?? null); setEmployeeBranchId(data?.branch_id ?? null); if (data?.branch_id) setBranchId((old: any) => old || data.branch_id); });
  }, [user]);

  useEffect(() => {
    if (tenantId) supabase.from("branches").select("id,name,is_active").eq("tenant_id", tenantId).eq("is_active", true).order("created_at").then(({ data }: any) => { const list = data ?? []; setBranches(list); setBranchId((old: any) => old || employeeBranchId || list[0]?.id || ""); });
    supabase.from("service_items").select("*").eq("is_active", true).order("name").then(({ data }: any) => setServices((data ?? []) as Service[]));
    supabase.from("service_areas").select("id,name,area_type,lat,lng,default_delivery_fee,aliases").eq("is_active", true).order("area_type").order("name").then(({ data }: any) => setAreas((data ?? []) as ServiceArea[]));
    supabase.from("app_settings").select("*").limit(1).maybeSingle().then(({ data }: any) => {
      if (data) {
        setSettings({ urgent_service_fee: Number(data.urgent_service_fee), default_delivery_fee: Number(data.default_delivery_fee), tax_percent: Number(data.tax_percent) });
        setDeliveryFee(String(data.default_delivery_fee));
        setUrgentFeeInput(String(data.urgent_service_fee ?? 0));
      }
    });
  }, [tenantId, employeeBranchId]);

  useEffect(() => {
    if (!customerSearch || customer) { setCustomerMatches([]); return; }
    const tSearch = setTimeout(async () => {
      const { data } = await supabase.from("customers").select("id, full_name, phone, address, lat, lng, location_url")
        .or(`full_name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`).limit(8);
      setCustomerMatches((data ?? []) as Customer[]);
    }, 180);
    return () => clearTimeout(tSearch);
  }, [customerSearch, customer]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return services.filter((s: any) => {
      const byFilter = filter === "all" || s.service_type === filter;
      const bySearch = !q || s.name.toLowerCase().includes(q);
      return byFilter && bySearch;
    });
  }, [services, filter, serviceSearch]);

  if (!canCreate) return <Card className="p-8 text-center text-muted-foreground">{t("orders.noCreateAccess", "صلاحية إنشاء الطلبات متاحة للاستقبال وخدمة العملاء والمالك فقط.")}</Card>;

  function addService(svcId: string) {
    const svc = services.find((s: any) => s.id === svcId);
    if (!svc) return;
    const idx = items.findIndex((it: any) => it.service_item_id === svc.id && it.unit_price === Number(svc.unit_price));
    if (idx >= 0) {
      setItems(items.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it));
    } else {
      setItems([{ service_item_id: svc.id, name: svc.name, service_type: svc.service_type, qty: 1, unit_price: Number(svc.unit_price) }, ...items]);
    }
  }
  function removeItem(idx: number) { setItems(items.filter((_: any, i: number) => i !== idx)); }
  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
  function inc(idx: number, by: number) {
    updateItem(idx, { qty: Math.max(1, items[idx].qty + by) });
  }

  const subtotal = items.reduce((s: number, it: any) => s + it.qty * it.unit_price, 0);
  const piecesCount = items.reduce((s: number, it: any) => s + it.qty, 0);
  const shirtCount = items.reduce((s: number, it: any) => s + (isShirtLikeName(it.name) ? it.qty : 0), 0);
  const urgentFee = isUrgent ? Number(urgentFeeInput || 0) : 0;
  const delivery = orderType === "delivery" ? Number(deliveryFee || 0) : 0;
  const discPct = Math.max(0, Math.min(100, Number(discountPct || 0)));
  const disc = (subtotal * discPct) / 100;
  const taxable = Math.max(0, subtotal + urgentFee + delivery - disc);
  const tax = taxable * (settings.tax_percent / 100);
  const total = taxable + tax;

  function applyArea(areaId: string, kind: "pickup" | "delivery" = "delivery") {
    const area = areas.find((a: any) => a.id === areaId);
    if (!area) return;
    const suffix = area.area_type === "compound" ? `${t("common.compound", "كمبوند")} ${area.name}` : area.name;
    if (kind === "pickup") {
      setPickupAddress((x: any) => x ? `${x} - ${suffix}` : suffix);
      if (area.lat && area.lng) setPickupLoc({ lat: String(area.lat), lng: String(area.lng) });
    } else {
      setDeliveryAddress((x: any) => x ? `${x} - ${suffix}` : suffix);
      if (area.lat && area.lng) setDeliveryLoc({ lat: String(area.lat), lng: String(area.lng) });
    }
    if (area.default_delivery_fee) setDeliveryFee(String(area.default_delivery_fee));
    toast.success(interpolate(t("orders.toastAreaSelected"), { name: area.name }));
  }

  function fillLocation(kind: "pickup" | "delivery") {
    const text = kind === "pickup" ? pickupAddress : deliveryAddress;
    const parsed = parseLatLng(text);
    if (parsed) {
      if (kind === "pickup") setPickupLoc({ lat: String(parsed.lat), lng: String(parsed.lng) });
      else setDeliveryLoc({ lat: String(parsed.lat), lng: String(parsed.lng) });
      toast.success(t("orders.toastCoordsExtracted"));
      return;
    }
    if (!navigator.geolocation) return toast.error(t("orders.noGps", "المتصفح لا يدعم تحديد الموقع"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude.toFixed(7), lng: pos.coords.longitude.toFixed(7) };
        if (kind === "pickup") setPickupLoc(loc); else setDeliveryLoc(loc);
        toast.success(t("orders.locDone", "تم تحديد الموقع الحالي"));
      },
      () => toast.error(t("orders.locError", "تعذر تحديد الموقع")),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit() {
    if (!customer && !newCustomer.full_name) { toast.error(t("orders.errCustomer", "اختار عميل أو أضف عميل جديد")); return; }
    const effectivePhone = customer?.phone ?? newCustomer.phone;
    if (phoneDigits(effectivePhone).length < 11) { toast.error(t("orders.errPhone", "رقم الهاتف يجب أن يكون 11 رقم على الأقل")); return; }
    if (!items.length) { toast.error(t("orders.errItems", "أضف قطعة أو خدمة واحدة على الأقل")); return; }
    if (!branchId) { toast.error(t("orders.errBranch", "اختار الفرع قبل إنشاء الطلب")); return; }
    if (!tenantId) { toast.error("Tenant ID missing"); return; }
    
    setSaving(true);

    try {
      let customerId = customer?.id;
      if (!customerId) {
        const { data, error } = await supabase.from("customers").insert({
          full_name: newCustomer.full_name, phone: newCustomer.phone, address: newCustomer.address || null,
          tenant_id: tenantId,
        }).select("id").single();
        if (error) throw error;
        customerId = data!.id;
      }

      if (!customerId) throw new Error("Failed to resolve customer ID");

      const order = await createOrder({
        customer_id: customerId,
        tenant_id: tenantId,
        branch_id: branchId,
        order_type: orderType,
        items: items.map(it => ({
          service_item_id: it.service_item_id,
          name: it.name,
          qty: it.qty,
          unit_price: it.unit_price,
          service_type: it.service_type
        })),
        total,
        notes
      });

      toast.success(t("orders.orderCreated", "تم إنشاء الطلب وتسجيل الحدث"));
      nav({ to: "/orders/$id", params: { id: order.id } });
    } catch (err: any) {
      toast.error(err.message || t("فشل إنشاء الطلب"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] -m-4 md:-m-6 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white" dir={dir}>
      <div className="p-3 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm"><Link to="/orders"><ArrowRight className="w-4 h-4" /></Link></Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{t("orders.newOrder", "طلب جديد")}</h1>
              <p className="text-xs md:text-sm text-teal-100/80">{t("orders.posSubtitle", "شاشة POS سريعة — اختار العميل، اضغط الخدمات، أنشئ الطلب")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-teal-500/20 text-teal-100 border-teal-400/30 px-3 py-1">{piecesCount} {t("orders.pieces", "قطعة")}</Badge>
            <Badge className="bg-blue-500/20 text-blue-100 border-blue-400/30 px-3 py-1">{shirtCount} {t("orders.shirts", "قميص/بلوزة")}</Badge>
            {isUrgent && <Badge className="bg-amber-500 text-black px-3 py-1"><Zap className="w-3 h-3 ms-1" /> {t("dashboard.kpi.urgent", "orders.urgent")}</Badge>}
          </div>
        </div>

        <div className="grid xl:grid-cols-[420px_1fr] gap-4 items-start">
          {/* Invoice rail */}
          <aside className="xl:sticky xl:top-16 space-y-3 order-2 xl:order-1">
            <Card className="bg-black/40 border-white/10 text-white shadow-2xl backdrop-blur">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-black text-lg flex items-center gap-2"><Receipt className="w-5 h-5 text-teal-300" /> {t("orders.invoice", "الفاتورة")}</div>
                  <Button variant="ghost" size="sm" className="text-red-200 hover:text-red-100" onClick={() => setItems([])} disabled={!items.length}>{t("common.clear", "مسح")}</Button>
                </div>

                <div className="space-y-2 max-h-[42vh] overflow-y-auto pe-1">
                  {!items.length && (
                    <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-300">
                      {t("orders.clickToAdd", "اضغط على أي خدمة لإضافتها هنا")}
                    </div>
                  )}
                  {items.map((it, idx) => (
                    <div key={`${it.service_item_id}-${idx}`} className="rounded-2xl bg-white/8 border border-white/10 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold leading-tight">{it.name}</div>
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-red-200" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-xl overflow-hidden border border-white/10">
                          <button className="px-3 py-2 bg-white/10" onClick={() => inc(idx, -1)}><Minus className="w-3 h-3" /></button>
                          <Input type="number" min={1} value={it.qty} onChange={(e: any) => updateItem(idx, { qty: Math.max(1, Number(e.target.value)) })} className="w-14 h-9 bg-transparent border-0 text-center text-white" />
                          <button className="px-3 py-2 bg-white/10" onClick={() => inc(idx, 1)}><Plus className="w-3 h-3" /></button>
                        </div>
                        <Input type="number" value={it.unit_price} onChange={(e: any) => updateItem(idx, { unit_price: Number(e.target.value) })} className="w-24 h-9 bg-white/5 border-white/10 text-white text-center" />
                        <div className="font-black text-teal-200 min-w-20 text-end">{fmtMoney(it.qty * it.unit_price)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-white/8 border border-white/10 p-3 space-y-2 text-sm">
                  <Row label={t("orders.subtotal", "المجموع الفرعي")} value={fmtMoney(subtotal, t("common.egp"))} />
                  {isUrgent && <Row label={t("settings.urgentFee", "رسوم استعجال")} value={fmtMoney(urgentFee)} />}
                  {orderType === "delivery" && <Row label={t("stage.delivery", "orders.delivery")} value={fmtMoney(delivery)} />}
                  {disc > 0 && <Row label={`${t("orders.discount", "خصم")} ${discPct}%`} value={`- ${fmtMoney(disc, t("common.egp"))}`} />}
                  {settings.tax_percent > 0 && <Row label={`${t("settings.taxPercent", "ضريبة")} ${settings.tax_percent}%`} value={fmtMoney(tax, t("common.egp"))} />}
                  <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center">
                    <span className="text-xl font-black">{t("common.total", "الإجمالي")}</span>
                    <span className="text-3xl font-black text-teal-200">{fmtMoney(total, t("common.egp"))}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={paymentStatus === "paid" ? "default" : "outline"} onClick={() => setPaymentStatus("paid")} className={paymentStatus === "paid" ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black" : "border-white/20 bg-white/5 text-white hover:bg-white/10"}>{t("status.payment.paid", "orders.paid")}</Button>
                  <Button type="button" variant={paymentStatus === "unpaid" ? "default" : "outline"} onClick={() => setPaymentStatus("unpaid")} className={paymentStatus === "unpaid" ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black" : "border-white/20 bg-white/5 text-white hover:bg-white/10"}>{t("status.payment.unpaid", "orders.unpaid")}</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild className="border-white/20 bg-white/5 text-white hover:bg-white/10"><Link to="/orders">{t("common.cancel", "common.cancel")}</Link></Button>
                  <Button onClick={submit} disabled={saving} className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black h-12">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("orders.createBtn", "إنشاء الطلب")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main POS */}
          <main className="space-y-4 order-1 xl:order-2">
            <Card className="bg-white/95 text-slate-950 border-0 shadow-2xl overflow-hidden">
              <CardContent className="p-4 space-y-4">
                <div className="grid lg:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3 space-y-2">
                    <div className="flex items-center gap-2 font-black"><Search className="w-4 h-4 text-teal-600" /> {t("customer.title", "العميل")}</div>
                    {customer ? (
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white border">
                        <div>
                          <div className="font-black">{customer.full_name}</div>
                          <div className="text-xs text-slate-500">{customer.phone}</div>{customer.address && <div className="text-xs text-slate-500 mt-1">{customer.address}</div>}
                        </div>
                        <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => { if (customer.address) { setPickupAddress(customer.address); setDeliveryAddress(customer.address); } if (customer.lat && customer.lng) { const loc = { lat: String(customer.lat), lng: String(customer.lng) }; setPickupLoc(loc); setDeliveryLoc(loc); } toast.success(t("orders.custDataApplied", "تم ملء بيانات العميل")); }}>{t("orders.useAddr", "استخدم العنوان")}</Button><Button size="sm" variant="ghost" onClick={() => { setCustomer(null); setCustomerSearch(""); }}>{t("common.change", "تغيير")}</Button></div>
                      </div>
                    ) : (
                      <>
                        <Input placeholder={t("orders.searchPlaceholder", "ابحث بالاسم أو الهاتف")} value={customerSearch} onChange={(e: any) => setCustomerSearch(e.target.value)} className="bg-white" />
                        {customerMatches.length > 0 && (
                          <div className="rounded-xl border bg-white divide-y overflow-hidden">
                            {customerMatches.map((c) => (
                              <button key={c.id} type="button" className="w-full text-start p-2 hover:bg-teal-50 text-sm" onClick={() => { setCustomer(c); if (c.address) { setPickupAddress(c.address); setDeliveryAddress(c.address); } if (c.lat && c.lng) { const loc = { lat: String(c.lat), lng: String(c.lng) }; setPickupLoc(loc); setDeliveryLoc(loc); } }}>
                                <div className="font-bold">{c.full_name}</div><div className="text-xs text-slate-500">{c.phone}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder={t("login.fullName", "الاسم الكامل")} value={newCustomer.full_name} onChange={(e: any) => setNewCustomer({ ...newCustomer, full_name: e.target.value })} className="bg-white" />
                          <Input placeholder={t("common.phone", "common.phone")} value={newCustomer.phone} onChange={(e: any) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="bg-white" />
                          <Input className="col-span-2 bg-white" placeholder={t("common.address", "common.address")} value={newCustomer.address} onChange={(e: any) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-3 space-y-3">
                    <div className="flex items-center gap-2 font-black"><CreditCard className="w-4 h-4 text-teal-600" /> {t("orders.payment", "الدفع")}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={branchId} onValueChange={setBranchId}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder={t("common.branch", "common.branch")} /></SelectTrigger>
                        <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="walk_in">{t("orders.walkin", "orders.walkin")}</SelectItem><SelectItem value="delivery">{t("stage.delivery", "orders.delivery")}</SelectItem></SelectContent>
                      </Select>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">{t("orders.cash", "نقدي")}</SelectItem><SelectItem value="instapay">InstaPay</SelectItem>
                          <SelectItem value="cod_cash">{t("method.cod_cash", "دفع عند الاستلام - نقدي")}</SelectItem><SelectItem value="cod_instapay">{t("method.cod_instapay", "دفع عند الاستلام - InstaPay")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm font-bold"><Checkbox checked={isUrgent} onCheckedChange={(v: any) => setIsUrgent(!!v)} /> {t("dashboard.kpi.urgent", "orders.urgent")}</label>
                      
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {isUrgent && <Input type="number" placeholder={t("settings.urgentFee", "استعجال")} value={urgentFeeInput} onChange={(e: any) => setUrgentFeeInput(e.target.value)} className="bg-white" />}
                      <Input type="number" placeholder={t("orders.discount", "خصم %")} value={discountPct} onChange={(e: any) => setDiscountPct(e.target.value)} className="bg-white" />
                      {orderType === "delivery" && <Input type="number" placeholder={t("settings.deliveryFee", "orders.delivery")} value={deliveryFee} onChange={(e: any) => setDeliveryFee(e.target.value)} className="bg-white" />}
                    </div>
                  </div>
                </div>

                {orderType === "delivery" && (
                  <div className="rounded-2xl bg-teal-50 border border-teal-100 p-3 space-y-3">
                    <div className="font-black flex items-center gap-2"><Truck className="w-4 h-4 text-teal-700" /> {t("orders.deliveryAddress", "عنوان التوصيل")}</div>
                    <div className="grid md:grid-cols-2 gap-2">
                      <Select onValueChange={(v: any) => applyArea(v, "pickup") }>
                        <SelectTrigger><SelectValue placeholder={t("orders.pickupArea", "منطقة الاستلام")} /></SelectTrigger>
                        <SelectContent>{areas.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} — {a.area_type === "compound" ? t("common.compound", "كمبوند") : a.area_type === "street" ? t("common.street", "شارع") : t("common.area", "منطقة")}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select onValueChange={(v: any) => applyArea(v, "delivery") }>
                        <SelectTrigger><SelectValue placeholder={t("orders.deliveryArea", "منطقة التسليم")} /></SelectTrigger>
                        <SelectContent>{areas.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} — {a.area_type === "compound" ? t("common.compound", "كمبوند") : a.area_type === "street" ? t("common.street", "شارع") : t("common.area", "منطقة")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid lg:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Input placeholder={t("orders.pickupAddress", "عنوان الاستلام بالتفصيل")} value={pickupAddress} onChange={(e: any) => setPickupAddress(e.target.value)} />
                        <div className="flex gap-2"><Input placeholder="Lat" value={pickupLoc.lat} onChange={(e: any) => setPickupLoc({ ...pickupLoc, lat: e.target.value })} /><Input placeholder="Lng" value={pickupLoc.lng} onChange={(e: any) => setPickupLoc({ ...pickupLoc, lng: e.target.value })} /><Button type="button" variant="outline" onClick={() => fillLocation("pickup")}><LocateFixed className="w-4 h-4" /></Button></div>
                      </div>
                      <div className="space-y-2">
                        <Input placeholder={t("orders.deliveryAddress", "عنوان التسليم بالتفصيل")} value={deliveryAddress} onChange={(e: any) => setDeliveryAddress(e.target.value)} />
                        <div className="flex gap-2"><Input placeholder="Lat" value={deliveryLoc.lat} onChange={(e: any) => setDeliveryLoc({ ...deliveryLoc, lat: e.target.value })} /><Input placeholder="Lng" value={deliveryLoc.lng} onChange={(e: any) => setDeliveryLoc({ ...deliveryLoc, lng: e.target.value })} /><Button type="button" variant="outline" onClick={() => fillLocation("delivery")}><LocateFixed className="w-4 h-4" /></Button></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/95 text-slate-950 border-0 shadow-2xl">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-xl">{t("orders.quickServices", "خدمات سريعة")}</div>
                    <div className="text-xs text-slate-500">{t("orders.quickServicesDetail", "اختر من الكتالوج لإضافة بنود للفاتورة")}</div>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className={`w-4 h-4 absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} />
                    <Input className={dir === 'rtl' ? "pr-9" : "pl-9"} placeholder={t("orders.searchService", "ابحث عن خدمة...")} value={serviceSearch} onChange={(e: any) => setServiceSearch(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {FILTERS.map((f: any) => {
                    const Icon = f.icon;
                    const active = filter === f.id;
                    const label = t(`common.${f.label}`, f.label);
                    return <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-2xl p-3 border text-sm font-black transition ${active ? "bg-teal-600 text-white border-teal-600 shadow-lg" : "bg-slate-50 hover:bg-slate-100"}`}><Icon className="w-4 h-4 mx-auto mb-1" />{label}</button>;
                  })}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredServices.map((s: any) => (
                    <button key={s.id} type="button" onClick={() => addService(s.id)} className="group rounded-3xl border bg-gradient-to-br from-white to-slate-50 hover:from-teal-50 hover:to-white hover:border-teal-300 p-4 text-start min-h-28 shadow-sm hover:shadow-xl transition active:scale-[.98]">
                      <div className="flex justify-between gap-2">
                        <div className="font-black text-base leading-tight group-hover:text-teal-700">{s.name}</div>
                        <Plus className="w-5 h-5 text-teal-600 opacity-60 group-hover:opacity-100" />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px]">{s.service_type === "both" ? t("common.washIron") : s.service_type === "ironing" ? t("common.ironOnly") : t("common.repair")}</Badge>
                        <div className="font-black text-teal-700">{fmtMoney(s.unit_price, t("common.egp"))}</div>
                      </div>
                    </button>
                  ))}
                  {!filteredServices.length && <div className="col-span-full text-center text-slate-500 p-10">{t("orders.noServices", "لا توجد خدمات مطابقة")}</div>}
                </div>

                <div>
                  <Label className="text-slate-700">{t("orders.notes", "common.notes")}</Label>
                  <Textarea rows={2} value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder={t("orders.notes", "أي ملاحظات إضافية على الطلب...")} />
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
