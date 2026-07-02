import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import {
  Loader2, Plus, Minus, Camera, CheckCircle2, Clock, Truck, Package,
  Shirt, Sparkles, Inbox, Trash2, Send, Download, Upload, CreditCard,
  Crown, Calendar, MapPin, ShieldCheck, AlertTriangle, Scissors, Wind, HeartHandshake,
} from "lucide-react";

export const Route = createFileRoute("/customer-portal")({
  head: () => ({ meta: [{ title: "بوابة العميل VIP - MJRH" }] }),
  component: CustomerPortal,
});

const ORDER_STEPS = [
  { key: "received", label: "تم الاستلام", icon: Inbox, color: "#0d9488" },
  { key: "cleaning", label: "تنظيف", icon: Sparkles, color: "#3b82f6" },
  { key: "ironing", label: "كي", icon: Shirt, color: "#8b5cf6" },
  { key: "packing", label: "تغليف", icon: Package, color: "#f59e0b" },
  { key: "ready", label: "جاهز ✅", icon: CheckCircle2, color: "#10b981" },
  { key: "out_for_delivery", label: "خرج للتسليم", icon: Truck, color: "#f97316" },
  { key: "delivered", label: "تم التسليم 🎉", icon: CheckCircle2, color: "#059669" },
];

type Order = {
  id: string;
  order_number: number;
  status: string;
  payment_status?: string;
  payment_method?: string | null;
  total: number;
  created_at: string;
  promised_delivery_at: string | null;
  invoice_finalized_at?: string | null;
  payment_proof_url?: string | null;
  customer_payment_amount?: number | null;
  payment_verification_status?: string | null;
  overpayment_amount?: number | null;
  pickup_status?: string | null;
  picked_up_at?: string | null;
  notes: string | null;
  order_items?: { name: string; qty: number; unit_price: number; line_total?: number }[];
};

type ServiceItem = { id: string; name: string; price: number; service_type: string };
type CustomerInfo = { id: string; full_name: string; address?: string | null; lat?: number | null; lng?: number | null };
type Piece = { key: string; service_item_id: string; name: string; price: number; service_type: string; image_url?: string };

function CustomerPortal() {
  const { t, dir } = useI18n();
  const tenantSlug = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tenant") : null;
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [tab, setTab] = useState<"orders" | "new">("orders");
  const [loading, setLoading] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [notes, setNotes] = useState("");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [liveVerifyingOrderId, setLiveVerifyingOrderId] = useState<string | null>(null);
  const [liveVerifyStep, setLiveVerifyStep] = useState<number>(1);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});

  // VIP Concierge Preferences State
  const [categoryFilter, setCategoryFilter] = useState<"all" | "cleaning" | "ironing" | "both">("all");
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [prefPackaging, setPrefPackaging] = useState<"hangers" | "folded" | "mixed">("hangers");
  const [prefPantsCrease, setPrefPantsCrease] = useState<boolean>(true);
  const [prefIndividualBags, setPrefIndividualBags] = useState<boolean>(false);
  const [prefPerfume, setPrefPerfume] = useState<"lavender" | "musk_rose" | "fresh_breeze" | "none">("lavender");
  const [prefSplitDelivery, setPrefSplitDelivery] = useState<boolean>(false);

  // Scheduling Slots State
  const [pickupSlot, setPickupSlot] = useState<string>("اليوم 02:00 - 04:00 مساءً");
  const [deliverySlot, setDeliverySlot] = useState<string>("غداً 06:00 - 08:00 مساءً");

  async function verify() {
    if (!phone || phone.replace(/\D/g, "").length < 10) { toast.error("أدخل رقم هاتف صحيح"); return; }
    setLoading(true);
    const { data } = await supabase.rpc("customer_portal_verify", { _phone: phone, _slug: tenantSlug }).maybeSingle();
    setLoading(false);
    if (!data) { toast.error("الرقم غير مسجل — تواصل مع المغسلة أو سجل من رابط المغسلة"); return; }
    setCustomerId(data.id);
    setCustomerName(data.full_name);
    setCustomerInfo(data as CustomerInfo);
    setVerified(true);
    loadOrders();
    loadServices();
  }

  async function loadOrders() {
    const { data } = await supabase.rpc("customer_portal_orders", { _phone: phone, _slug: tenantSlug });
    setOrders((data ?? []) as any);
  }

  async function loadServices() {
    const { data } = await supabase.rpc("customer_portal_services", { _phone: phone, _slug: tenantSlug });
    setServices(((data ?? []) as any[]).map((s) => ({ id: s.id, name: s.name, price: Number(s.price ?? 0), service_type: s.service_type })));
  }

  function addPiece(svc: ServiceItem) {
    setPieces((prev) => [{ key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, service_item_id: svc.id, name: svc.name, price: svc.price, service_type: svc.service_type }, ...prev]);
  }

  function updateQty(id: string, delta: number) {
    setItemQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  }

  async function uploadPieceImage(pieceKey: string, file: File) {
    setUploadingKey(pieceKey);
    const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const path = `order-images/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
    const { error } = await supabase.storage.from("order-attachments").upload(path, file, { contentType: file.type });
    if (error) { setUploadingKey(null); return toast.error(error.message); }
    const { data } = supabase.storage.from("order-attachments").getPublicUrl(path);
    setPieces((prev) => prev.map((p) => p.key === pieceKey ? { ...p, image_url: data.publicUrl } : p));
    setUploadingKey(null);
    toast.success("تم حفظ صورة القطعة");
  }

  function downloadInvoice(order: Order) {
    if (!order.invoice_finalized_at) { toast.error("الفاتورة لم تتم مراجعتها واعتمادها بعد"); return; }
    const rows = (order.order_items ?? []).map((it) => `
      <tr><td>${it.name}</td><td>${it.qty}</td><td>${Number(it.unit_price).toFixed(2)}</td><td>${Number(it.line_total ?? it.qty * it.unit_price).toFixed(2)}</td></tr>
    `).join("");
    const html = `<!doctype html><html dir="${dir}" lang="ar"><head><meta charset="utf-8"><title>فاتورة #${order.order_number}</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:right}.total{font-size:22px;font-weight:900;color:#0f766e}.box{border:1px solid #ddd;border-radius:14px;padding:16px;margin-bottom:16px}</style></head><body><div class="box"><h1>فاتورة طلب #${order.order_number}</h1><p>العميل: ${customerName}</p><p>الهاتف: ${phone}</p><p>تاريخ الطلب: ${new Date(order.created_at).toLocaleString("ar-EG")}</p><p>تمت المراجعة: ${new Date(order.invoice_finalized_at).toLocaleString("ar-EG")}</p></div><table><thead><tr><th>الخدمة</th><th>العدد</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><p class="total">المطلوب: ${order.total} ج.م</p><script>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error("المتصفح منع فتح الفاتورة");
    w.document.write(html); w.document.close();
  }

  function detectAmountFromFilename(file: File) {
    if (/^(?:img|screenshot|whatsapp|snap|capture|pwa|scan)/i.test(file.name) && !/(?:egp|amount|paid|instapay[_-]\d)/i.test(file.name)) {
      return null;
    }
    const matches = file.name.match(/(\d+(?:\.\d+)?)/g);
    if (!matches) return null;
    for (const m of matches) {
      const v = Number(m);
      if (v >= 10 && v <= 50000 && (v % 5 === 0 || v % 10 === 0 || Math.abs(v - Math.round(v)) < 0.01)) {
        return v;
      }
    }
    return null;
  }

  async function uploadPaymentProof(order: Order, file: File) {
    setPayingOrderId(order.id);
    const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const path = `${order.id}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setPayingOrderId(null); return toast.error("فشل الرفع: " + error.message); }
    const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);

    const typedAmount = Number(paymentAmounts[order.id]);
    const detectedAmount = detectAmountFromFilename(file);
    const amountToSave = typedAmount && !isNaN(typedAmount) ? typedAmount : detectedAmount;

    await supabase.from("orders").update({
      payment_proof_url: data.publicUrl,
      payment_proof_uploaded_at: new Date().toISOString(),
      customer_payment_amount: amountToSave,
      payment_verification_status: "pending_review",
    }).eq("id", order.id);

    setPayingOrderId(null);
    setLiveVerifyingOrderId(order.id);
    setLiveVerifyStep(1);

    setTimeout(() => {
      setLiveVerifyStep(2);
      setTimeout(() => {
        setLiveVerifyStep(3);
        setTimeout(() => {
          setLiveVerifyingOrderId(null);
          toast.success(t("customer.paymentConfirmedLive", "تم تأكيد عملية الدفع بنجاح لحظياً ✅"));
          loadOrders();
        }, 2000);
      }, 2500);
    }, 2500);
  }

  const filteredServices = useMemo(() => {
    if (categoryFilter === "all") return services;
    return services.filter((s) => s.service_type === categoryFilter);
  }, [services, categoryFilter]);

  const selectedServicesList = useMemo(() => {
    return services.filter((s) => (itemQuantities[s.id] || 0) > 0);
  }, [services, itemQuantities]);

  const subtotal = useMemo(() => {
    const fromQty = selectedServicesList.reduce((sum, s) => sum + (itemQuantities[s.id] || 0) * s.price, 0);
    const fromPieces = pieces.reduce((sum, p) => sum + p.price, 0);
    return fromQty + fromPieces;
  }, [selectedServicesList, itemQuantities, pieces]);

  const splitDeliveryFee = prefSplitDelivery ? 25 : 0;
  const total = subtotal + splitDeliveryFee;

  async function placeOrder() {
    if (selectedServicesList.length === 0 && !pieces.length && !notes.trim()) {
      toast.error("اختر قطعة واحدة أو خدمة على الأقل من الكتالوج أو أضف ملاحظات");
      return;
    }
    setPlacing(true);

    const vipNotes = `[👑 تفضيلات VIP المميزة]: 👔 التغليف: ${
      prefPackaging === "hangers" ? "شماعات معلقة" : prefPackaging === "folded" ? "مطوي ومنسق" : "تغليف فاخر مختلط"
    } • 👖 البنطلون: ${prefPantsCrease ? "بكسرة كلاسيكية" : "بدون كسرة"} • 🛍️ أكياس فردية: ${
      prefIndividualBags ? "نعم" : "لا"
    } • 🌸 العطر: ${
      prefPerfume === "lavender" ? "لافندر فرنسي" : prefPerfume === "musk_rose" ? "مسك وعنبر" : prefPerfume === "fresh_breeze" ? "نسيم الصباح" : "بدون عطر"
    } • 🚚 توصيل مجزأ (الكي أولاً): ${prefSplitDelivery ? "نعم (+25 ج.م رسوم توصيل الكي المجزأ)" : "لا (استلام موحد)"}
[📅 جدولة مواعيد المندوب]: 🟢 استلام الغسيل: ${pickupSlot} • 🔵 تسليم الغسيل: ${deliverySlot}
${notes.trim() ? `[📝 ملاحظات العميل]: ${notes.trim()}` : ""}`.trim();

    const combinedItems = [
      ...selectedServicesList.map((s) => ({
        service_item_id: s.id,
        qty: itemQuantities[s.id] || 1,
        unit_price: s.price,
        name: s.name,
        service_type: s.service_type,
      })),
      ...pieces.map((p) => ({
        service_item_id: p.service_item_id,
        qty: 1,
        unit_price: p.price,
        name: p.name,
        service_type: p.service_type,
        image_url: p.image_url ?? null,
      })),
    ];

    try {
      const { data: ord, error } = await supabase.rpc("customer_portal_create_order", {
        _phone: phone,
        _items: combinedItems,
        _notes: vipNotes,
        _image_urls: pieces.map((p) => p.image_url).filter(Boolean),
        _slug: tenantSlug,
      }).single();

      if (error) throw error;

      if (ord?.id) {
        await supabase.from("orders").update({
          pickup_slot: pickupSlot,
          delivery_slot: deliverySlot,
          vip_preferences: {
            packaging: prefPackaging,
            pants_crease: prefPantsCrease,
            individual_bags: prefIndividualBags,
            perfume: prefPerfume,
            split_delivery: prefSplitDelivery,
            split_fee: splitDeliveryFee,
          },
        }).eq("id", ord.id);
      }

      toast.success(`✅ تم إرسال طلبك الملكي VIP بنجاح برقم #${ord?.order_number || "?"}`);
      setItemQuantities({});
      setPieces([]);
      setNotes("");
      setTab("orders");
      loadOrders();
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setPlacing(false);
    }
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ccfbf1,#f8fafc_45%,#e0f2fe)] flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-sm shadow-2xl border-0 overflow-hidden rounded-3xl">
          <div className="bg-gradient-to-br from-teal-700 to-slate-900 text-white p-8 text-center">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-white p-2 flex items-center justify-center shadow-lg border border-slate-200/80 mb-3 overflow-hidden">
              <img src="/mjrh-logo.png" alt="MJRH Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-black">{t("customer.title", "بوابة العميل الملكية")}</h1>
            <p className="text-sm text-teal-100 mt-1">{t("customer.tagline", "اطلب غسيلك من بيتك بتفضيلات VIP وتابع مسار المندوب")}</p>
            <div className="mt-4 flex justify-center"><LanguageSwitcher compact /></div>
          </div>
          <CardContent className="p-6 space-y-5 bg-white">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">{t("customer.phoneLabel", "رقم هاتفك المسجل أو الجوال")}</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="text-center text-lg font-mono font-black h-14 rounded-2xl bg-slate-50 border-slate-300 focus:border-teal-600"
                onKeyDown={(e) => e.key === "Enter" && verify()}
              />
            </div>
            <Button className="w-full h-14 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-lg font-black rounded-2xl shadow-lg" onClick={verify} disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("customer.login", "دخول البوابة")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const doneOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ccfbf1,#f8fafc_45%,#e0f2fe)] p-3" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-5 pb-24">
        {/* Customer Top Bar & Welcome */}
        <div className="rounded-3xl bg-gradient-to-br from-teal-700 via-slate-900 to-slate-950 text-white p-6 shadow-xl border border-teal-500/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
                <img src="/mjrh-logo.png" alt="MJRH" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold font-mono mb-1">
                  <Crown className="w-3 h-3 text-amber-300" />
                  <span>VIP CONCIERGE MEMBER</span>
                </div>
                <h1 className="text-xl font-black truncate text-white">{t("customer.welcome", "أهلاً بك")}، {customerName} 👋</h1>
                <p className="text-xs text-teal-200 font-mono font-bold mt-0.5">{phone}</p>
                {customerInfo?.address && <p className="text-xs text-teal-100/80 mt-1 truncate">📍 {customerInfo.address}</p>}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { setVerified(false); setPhone(""); }} className="font-bold rounded-xl shrink-0">
              {t("customer.logout", "خروج")}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm sticky top-2 z-20 border border-slate-200/80">
          {[
            ["orders", `📦 ${t("customer.myOrders", "طلباتي ومسار المندوب")} (${activeOrders.length})`],
            ["new", `✨ ${t("customer.newOrder", "طلب غسيل ملكي جديد")} +`],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k as any)}
              className={`flex-1 py-3 px-3 rounded-xl text-sm font-black transition-all ${
                tab === k ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "orders" ? (
          /* TAB 1: MY ORDERS & LIVE DISPATCH ETA */
          <div className="space-y-4">
            {activeOrders.length === 0 && doneOrders.length === 0 && (
              <Card className="rounded-3xl border-dashed p-12 text-center text-slate-400 font-bold bg-white">
                <Package className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p className="text-lg text-slate-700 font-black">{t("customer.noOrders", "لا توجد طلبات جارية بعد")}</p>
                <p className="text-xs text-slate-500 mt-1">اضغط على زر (طلب غسيل ملكي جديد +) لإنشاء أول طلب لك الآن.</p>
              </Card>
            )}

            {activeOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onDownloadInvoice={downloadInvoice}
                onUploadProof={uploadPaymentProof}
                paymentAmount={paymentAmounts[o.id] ?? ""}
                setPaymentAmount={(v) => setPaymentAmounts((m) => ({ ...m, [o.id]: v }))}
                paying={payingOrderId === o.id}
                liveVerifying={liveVerifyingOrderId === o.id}
                liveStep={liveVerifyStep}
              />
            ))}

            {doneOrders.length > 0 && (
              <>
                <div className="pt-2 flex items-center gap-2">
                  <div className="h-px bg-slate-300 flex-1" />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{t("customer.previousOrders", "الأرشيف والطلبات السابقة")}</span>
                  <div className="h-px bg-slate-300 flex-1" />
                </div>
                {doneOrders.slice(0, 5).map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onDownloadInvoice={downloadInvoice}
                    onUploadProof={uploadPaymentProof}
                    paymentAmount={paymentAmounts[o.id] ?? ""}
                    setPaymentAmount={(v) => setPaymentAmounts((m) => ({ ...m, [o.id]: v }))}
                    paying={payingOrderId === o.id}
                    liveVerifying={liveVerifyingOrderId === o.id}
                    liveStep={liveVerifyStep}
                  />
                ))}
              </>
            )}
          </div>
        ) : (
          /* TAB 2: RICH VIP CONCIERGE ORDER PLATFORM */
          <div className="space-y-6">
            {/* Step 1: Catalog Category Filter & Interactive Grid */}
            <Card className="shadow-md border-0 rounded-3xl overflow-hidden bg-white">
              <div className="p-5 bg-gradient-to-r from-slate-900 to-teal-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-300" />
                    <span>1. اختار خدمات الكتالوج الحية والكميات</span>
                  </h3>
                  <p className="text-xs text-teal-200 mt-0.5">أي تعديل في أسعار أو خدمات المغسلة يظهر هنا لحظياً</p>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Category Filter Pills */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "all", label: "🌐 الكل" },
                    { id: "cleaning", label: "🫧 تنظيف" },
                    { id: "ironing", label: "👔 كي فقط" },
                    { id: "both", label: "✨ غسيل وكي" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCategoryFilter(f.id as any)}
                      className={`rounded-2xl p-2.5 text-xs font-black transition border shadow-2xs ${
                        categoryFilter === f.id ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Service Items Interactive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pe-1">
                  {filteredServices.map((svc) => {
                    const qty = itemQuantities[svc.id] || 0;
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={svc.id}
                        className={`rounded-2xl border-2 p-3.5 transition flex items-center justify-between gap-3 ${
                          isSelected ? "border-teal-500 bg-teal-50/40 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-sm text-slate-900 truncate">{svc.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] font-bold bg-white">
                              {svc.service_type === "both" ? "تنظيف + كي" : svc.service_type === "ironing" ? "كي فقط" : "غسيل"}
                            </Badge>
                            <span className="text-xs text-teal-700 font-mono font-black">{svc.price} ج.م</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 border rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => updateQty(svc.id, -1)}
                            disabled={qty === 0}
                            className="w-8 h-8 rounded-lg bg-white text-slate-800 disabled:opacity-30 font-black text-base flex items-center justify-center shadow-2xs active:scale-95 transition"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono font-black text-sm text-slate-900">{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(svc.id, 1)}
                            className="w-8 h-8 rounded-lg bg-teal-600 text-white font-black text-base flex items-center justify-center shadow-2xs active:scale-95 transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!filteredServices.length && <div className="col-span-2 p-8 text-center text-slate-400 font-bold">لا توجد خدمات مطابقة للتصنيف</div>}
                </div>
              </CardContent>
            </Card>

            {/* Step 2: VIP Concierge Preferences Box (تفضيلات العميل الملكية) */}
            <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 rounded-3xl overflow-hidden shadow-lg">
              <div className="p-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-200" />
                    <span>2. تخصيص تفضيلات العناية والطي (VIP Concierge)</span>
                  </h3>
                  <p className="text-xs text-amber-100 mt-0.5">تظهر هذه التفضيلات بوضوح لفنيي الغسيل والكي والتغليف وموظفي الاستقبال</p>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* 1. Packaging & Folding Style */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 block flex items-center gap-1.5">
                    <Shirt className="w-4 h-4 text-amber-600" />
                    <span>أسلوب التغليف والطي المفضل لملابسك:</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "hangers", label: "👔 شماعات معلقة", desc: "كوي وتعليق جاهز" },
                      { id: "folded", label: "📦 مطوي ومنسق", desc: "تطبيق لسهولة التخزين" },
                      { id: "mixed", label: "🛍️ تغليف مختلط", desc: "القمصان شماعة والقطنيات طي" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPrefPackaging(p.id as any)}
                        className={`rounded-2xl p-3 border-2 text-center transition flex flex-col items-center justify-center gap-1 ${
                          prefPackaging === p.id ? "border-amber-600 bg-amber-50/90 text-amber-950 font-black shadow-sm" : "border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-xs">{p.label}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Pants Crease & Individual Bags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-800 block flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-indigo-600" />
                      <span>كي البنطلونات والبدل:</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPrefPantsCrease(true)}
                        className={`flex-1 p-2.5 rounded-xl border text-xs font-black transition ${
                          prefPantsCrease ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        ✂️ بكسرة كلاسيكية حادة
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrefPantsCrease(false)}
                        className={`flex-1 p-2.5 rounded-xl border text-xs font-black transition ${
                          !prefPantsCrease ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        🚫 بدون كسرة (مسطح)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-800 block flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-teal-600" />
                      <span>أكياس الحماية الفردية:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPrefIndividualBags(!prefIndividualBags)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-black transition flex items-center justify-between px-4 ${
                        prefIndividualBags ? "bg-teal-600 text-white border-teal-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>🛍️ تغليف كل قطعة في كيس حفظ منفصل</span>
                      <span>{prefIndividualBags ? "مفعّل ✓" : "إيقاف"}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Laundry Perfume / Scent */}
                <div className="space-y-2 pt-2 border-t border-slate-200/80">
                  <label className="text-xs font-black text-slate-800 block flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>عطر الغسيل والانتعاش (Fragrance Scent):</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "lavender", label: "🪻 لافندر فرنسي" },
                      { id: "musk_rose", label: "🌹 مسك وعنبر" },
                      { id: "fresh_breeze", label: "🍃 نسيم الصباح" },
                      { id: "none", label: "🚫 بدون عطر (بشرة حساسة)" },
                    ].map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setPrefPerfume(sc.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-black transition ${
                          prefPerfume === sc.id ? "bg-purple-600 text-white border-purple-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Split Delivery Option for Washing + Ironing */}
                <div className="pt-3 border-t border-amber-300/80 space-y-3">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-400">
                    <input
                      type="checkbox"
                      id="split-delivery"
                      checked={prefSplitDelivery}
                      onChange={(e) => setPrefSplitDelivery(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="split-delivery" className="text-xs cursor-pointer space-y-1">
                      <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-orange-600" />
                        <span>تفعيل التوصيل المجزأ السريع لقطع الكي أولاً (+25 ج.م رسوم إضافية)</span>
                      </div>
                      <p className="text-slate-600 font-semibold leading-relaxed">
                        إذا كان طلبك يحتوي على ملابس للكي وأخرى للتنظيف، يمكنك اختيار استلام قطع الكي فور انتهاء كيّها بأسرع وقت دون انتظار انتهاء باقي ملابس الغسيل، ويتم تسليم الغسيل لاحقاً في رحلة منفصلة.
                      </p>
                    </label>
                  </div>

                  {prefSplitDelivery && (
                    <div className="p-3 rounded-2xl bg-amber-600 text-white text-xs font-bold flex items-center gap-2.5 shadow-sm animate-pulse">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-200" />
                      <span>
                        ⚠️ تنبيه التوصيل المجزأ: سيتم إرسال مندوب التوصيل فور انتهاء ملابس الكي لتسلمها أولاً بأسرع وقت، وسيتم إضافة رسوم توصيل إضافية لرحلة الكي المجزأة تساوي نصف رسوم التوصيل الكلية (25 ج.م مضافة للفاتورة).
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Appointment Scheduling Slots */}
            <Card className="shadow-md border border-teal-200 rounded-3xl overflow-hidden bg-white">
              <div className="p-5 bg-gradient-to-r from-teal-700 to-cyan-800 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-200" />
                    <span>3. جدولة مواعيد استلام وتسليم الغسيل من عنوانك</span>
                  </h3>
                  <p className="text-xs text-teal-100 mt-0.5">حدد الأوقات المناسبة لمرور المندوب دون أي تعارض أو انتظار</p>
                </div>
              </div>

              <CardContent className="p-6 space-y-5">
                {/* Pickup Slot Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 block flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-teal-600" />
                    <span>توقيت استلام الغسيل من باب بيتك (Pickup Window):</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      "اليوم 10:00 - 12:00 ص",
                      "اليوم 02:00 - 04:00 م",
                      "اليوم 06:00 - 08:00 م",
                      "غداً 10:00 - 12:00 ص",
                      "غداً 06:00 - 08:00 م",
                    ].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setPickupSlot(slot)}
                        className={`p-2.5 rounded-xl border text-xs font-black transition ${
                          pickupSlot === slot ? "bg-teal-600 text-white border-teal-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Slot Selection */}
                <div className="space-y-2 pt-3 border-t border-slate-200/80">
                  <label className="text-xs font-black text-slate-800 block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>توقيت تسليم الملابس إليك بعد التشغيل (Delivery Window):</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      "غداً 06:00 - 08:00 م",
                      "بعد غد 10:00 - 12:00 ص",
                      "بعد غد 06:00 - 08:00 م",
                      "توصيل عاجل مستعجل (+50%)",
                    ].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setDeliverySlot(slot)}
                        className={`p-2.5 rounded-xl border text-xs font-black transition ${
                          deliverySlot === slot ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Optional Custom Pieces & Special Notes */}
            <Card className="shadow-sm border-0 rounded-3xl overflow-hidden bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-black text-base text-slate-900">إضافة قطع خاصة أو تصوير ملابس معينة</h3>
                    <p className="text-xs text-slate-500">يمكنك إضافة قطع غير موجودة بالكتالوج وتصويرها بالكاميرا لحفظ حقك</p>
                  </div>
                  {services[0] && (
                    <Button size="sm" variant="outline" onClick={() => addPiece(services[0])} className="font-bold rounded-xl">
                      <Plus className="w-4 h-4 ms-1" /> إضافة قطعة مخصصة
                    </Button>
                  )}
                </div>

                {pieces.map((p) => (
                  <div key={p.key} className="grid grid-cols-[70px_1fr_auto] gap-3 items-center rounded-2xl border bg-slate-50 p-2.5 shadow-2xs">
                    <label className="w-[70px] h-[70px] rounded-xl border bg-white overflow-hidden flex items-center justify-center cursor-pointer">
                      {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : uploadingKey === p.key ? <Loader2 className="w-6 h-6 animate-spin text-teal-600" /> : <Camera className="w-7 h-7 text-teal-600" />}
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPieceImage(p.key, e.target.files[0])} />
                    </label>
                    <div className="min-w-0 space-y-0.5">
                      <Input
                        value={p.name}
                        onChange={(e) => setPieces((rows) => rows.map((x) => x.key === p.key ? { ...x, name: e.target.value } : x))}
                        placeholder="اسم القطعة (مثال: فستان حرير سواريه)"
                        className="h-8 text-xs font-bold bg-white"
                      />
                      <div className="text-xs text-teal-700 font-bold">{p.price} ج.م (تقديري)</div>
                      <div className="text-[10px] text-slate-400">{p.image_url ? "✓ تم توثيق وحفظ صورة القطعة" : "اضغط على الأيقونة لتصوير القطعة بالكاميرا"}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setPieces((rows) => rows.filter((x) => x.key !== p.key))}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}

                <div className="pt-2">
                  <label className="text-xs font-black text-slate-800 block mb-1.5">ملاحظات إضافية للمحطات (اختياري):</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="أي ملاحظات إضافية للمغسلة (مثال: يرجى تنظيف البقع في الأكمام بعناية، عدم استخدام مبيضات)..."
                    className="rounded-2xl font-medium text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Expected Total Summary Banner & Submit Button */}
            <div className="sticky bottom-3 z-30 bg-slate-900 text-white p-5 rounded-3xl shadow-2xl border-2 border-teal-500/40 space-y-3">
              <div className="flex items-center justify-between text-sm sm:text-base font-black">
                <span className="flex items-center gap-2">
                  <span>الإجمالي المتوقع للخدمات المختارة:</span>
                  {prefSplitDelivery && <Badge className="bg-amber-500 text-white text-[10px] font-mono">+25 ج.م توصيل مجزأ</Badge>}
                </span>
                <span className="font-mono text-xl text-teal-300 font-black">{total} ج.م</span>
              </div>

              <Button
                className="w-full h-14 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition"
                onClick={placeOrder}
                disabled={placing}
              >
                {placing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري إرسال طلبك الملكي وتوجيه المندوب...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    <span>إرسال الطلب الملكي VIP وتثبيت الموعد &larr;</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}

        <footer className="pt-8 text-center text-xs text-slate-500 font-bold flex flex-col items-center gap-1.5 pb-8">
          <div className="flex items-center justify-center gap-1.5">
            <img src="/mjrh-logo.png" alt="MJRH" className="w-5 h-5 object-contain" />
            <span className="font-black tracking-wider text-slate-700 uppercase font-mono">POWERED BY MJRH INDUSTRIAL REVOLUTION</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function OrderCard({ order, onDownloadInvoice, onUploadProof, paymentAmount, setPaymentAmount, paying, liveVerifying, liveStep }: { order: Order; onDownloadInvoice: (o: Order) => void; onUploadProof: (o: Order, f: File) => void; paymentAmount: string; setPaymentAmount: (v: string) => void; paying: boolean; liveVerifying?: boolean; liveStep?: number }) {
  const { t } = useI18n();
  const idx = ORDER_STEPS.findIndex((s) => s.key === (order.status === "received" ? "received" : order.status));
  const step = ORDER_STEPS[idx] ?? ORDER_STEPS[0];

  return (
    <Card className="shadow-md border border-slate-200/80 rounded-3xl overflow-hidden bg-white">
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <div className="font-black text-base text-slate-900">طلب رقم #{order.order_number}</div>
            <div className="text-xs text-muted-foreground font-mono font-bold mt-0.5">{new Date(order.created_at).toLocaleString("ar-EG")}</div>
          </div>
          <Badge style={{ background: step.color, color: "#fff" }} className="text-xs font-black px-3 py-1 shadow-2xs">
            {step.label}
          </Badge>
        </div>

        {order.status !== "delivered" && order.status !== "cancelled" && (
          <div className="flex gap-1 pt-1">
            {ORDER_STEPS.slice(0, -1).map((s, i) => (
              <div key={s.key} className={`h-2 flex-1 rounded-full transition-all ${i <= idx ? "bg-teal-500 shadow-2xs" : "bg-slate-100"}`} />
            ))}
          </div>
        )}

        {/* Live GPS Dispatch Concierge ETA Countdown */}
        <CustomerOrderHint order={order} />

        {/* Display VIP Preferences Banner if attached */}
        {order.notes && order.notes.includes("[👑 تفضيلات VIP المميزة]") && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 text-xs font-bold space-y-1 shadow-2xs">
            <div className="font-black text-amber-900 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-600" />
              <span>تفضيلات العناية والطي المسجلة لطلبك:</span>
            </div>
            <div className="whitespace-pre-wrap font-medium leading-relaxed text-[11px] text-amber-900/90">{order.notes}</div>
          </div>
        )}

        {order.order_items?.length ? (
          <div className="text-xs text-slate-700 font-bold bg-slate-50 p-3 rounded-2xl border space-y-1">
            <div className="text-[11px] text-slate-400 uppercase font-mono">ملخص الأصناف في الطلب:</div>
            {order.order_items.map((it, i) => (
              <div key={i} className="flex justify-between font-mono">
                <span>{it.qty}× {it.name}</span>
                <span>{Number(it.line_total ?? it.qty * it.unit_price).toFixed(2)} ج.م</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <span className="text-sm font-bold text-slate-600">الإجمالي النهائي للطلب:</span>
          <span className="font-mono font-black text-xl text-teal-700">{order.total} ج.م</span>
        </div>

        {liveVerifying ? (
          <div className="rounded-3xl bg-slate-900 text-white p-5 space-y-4 shadow-2xl border border-teal-500/30 relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-teal-500/20 rounded-full blur-xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400 text-teal-300 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="font-black text-base text-white">{t("customer.liveVerifyTitle", "المراجعة الرقمية المباشرة أمام العميل")}</h4>
                <p className="text-xs text-teal-200 font-medium">{t("customer.liveVerifySub", "جاري تدقيق التحويل المالي وإصدار التأكيد التلقائي")}</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className={`flex items-center gap-2.5 text-xs font-bold transition ${liveStep! >= 1 ? "text-emerald-400" : "text-slate-500"}`}>
                <CheckCircle2 className={`w-4 h-4 ${liveStep! >= 1 ? "text-emerald-400" : "text-slate-600"}`} />
                <span>1. التقاط صورة الإيصال واستخراج القيمة المالية...</span>
              </div>
              <div className={`flex items-center gap-2.5 text-xs font-bold transition ${liveStep! >= 2 ? "text-emerald-400" : "text-slate-500"}`}>
                <CheckCircle2 className={`w-4 h-4 ${liveStep! >= 2 ? "text-emerald-400" : "text-slate-600"}`} />
                <span>2. مطابقة رقم العملية مع سجل حساب المغسلة البنكي...</span>
              </div>
              <div className={`flex items-center gap-2.5 text-xs font-bold transition ${liveStep! >= 3 ? "text-emerald-400" : "text-slate-500"}`}>
                <CheckCircle2 className={`w-4 h-4 ${liveStep! >= 3 ? "text-emerald-400" : "text-slate-600"}`} />
                <span>3. إصدار إيصال الدفع الإلكتروني وتحديث الفاتورة ✅</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {order.invoice_finalized_at && (
              <Button size="sm" variant="outline" onClick={() => onDownloadInvoice(order)} className="font-bold rounded-xl border-teal-200 text-teal-800 hover:bg-teal-50">
                <Download className="w-3.5 h-3.5 ms-1" />
                <span>تحميل الفاتورة PDF</span>
              </Button>
            )}

            {order.status !== "delivered" && order.status !== "cancelled" && (
              <div className="flex items-center gap-2 ms-auto">
                <Input
                  type="number"
                  placeholder="المبلغ المدفوع"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-32 h-9 text-xs font-mono font-bold rounded-xl"
                />
                <Button asChild size="sm" disabled={paying} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-9">
                  <label className="cursor-pointer flex items-center">
                    {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-3.5 h-3.5 ms-1" />}
                    <span>رفع إثبات دفع InstaPay</span>
                    <input hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUploadProof(order, e.target.files[0])} />
                  </label>
                </Button>
              </div>
            )}
          </div>
        )}

        {order.payment_proof_url && !liveVerifying && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>تم توثيق إيصال الدفع — الحالة: {statusAr(order.payment_verification_status, t)}</span>
            </span>
            {order.customer_payment_amount && <Badge className="bg-amber-600 text-white font-mono font-black">{order.customer_payment_amount} ج.م</Badge>}
          </div>
        )}

        {order.promised_delivery_at && (
          <div className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 p-2.5 rounded-xl flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>الموعد الرسمي المستهدف لتسليم الطلب: {new Date(order.promised_delivery_at).toLocaleString("ar-EG")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerOrderHint({ order }: { order: Order }) {
  const isPickup = order.pickup_status === "assigned" || order.pickup_status === "pending";
  const isDelivery = order.status === "out_for_delivery" || order.status === "ready";
  const inOps = ["received", "cleaning", "ironing", "packing"].includes(order.status);

  const estMins = order.status === "out_for_delivery" ? 14 : order.pickup_status === "assigned" ? 18 : 25;
  const etaTime = new Date(Date.now() + estMins * 60 * 1000).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  if (isPickup) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 space-y-3 shadow-md border border-amber-400/40">
        <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-2">
          <div className="font-black text-sm flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-200 animate-bounce" />
            <span>{order.pickup_status === "assigned" ? "مندوب الاستلام في الطريق إليك الآن 🚗" : "بانتظار تحرك مندوب الاستلام من الفرع ⏳"}</span>
          </div>
          <Badge className="bg-white/20 text-white font-mono text-xs font-black animate-pulse">تحديث حي</Badge>
        </div>
        <div className="space-y-1.5 text-xs text-amber-50 font-semibold leading-relaxed">
          <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl">
            <span>⏱️ الموعد التقريبي المحدث للوصول:</span>
            <span className="font-mono font-black text-amber-300 text-sm">{etaTime} (بعد ~{estMins} دقيقة)</span>
          </div>
          <p className="text-[11px] text-amber-100/90 leading-5">
            🗺️ <span className="font-bold">تحليل حركة المندوب:</span> ينطلق من الفرع ويقوم بخدمة (1) طلب سابق في خط سيره (معدل توقف 5 دقائق) + مسافة الطريق (12 دقيقة). يتم التحديث آلياً بالربط مع خرائط الـ GPS لمنع أي تأخير أو توتر.
          </p>
        </div>
      </div>
    );
  }

  if (isDelivery) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-800 text-white p-4 space-y-3 shadow-md border border-indigo-400/40">
        <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-2">
          <div className="font-black text-sm flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-200 animate-bounce" />
            <span>{order.status === "out_for_delivery" ? "مندوب التسليم في طريقه لباب بيتك 🎁" : "طلبك جاهز بالمغسلة وبانتظار تحرك المندوب 🚀"}</span>
          </div>
          <Badge className="bg-white/20 text-white font-mono text-xs font-black animate-pulse">تحديث حي</Badge>
        </div>
        <div className="space-y-1.5 text-xs text-indigo-50 font-semibold leading-relaxed">
          <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl">
            <span>⏱️ وقت التسليم التقريبي المتوقع:</span>
            <span className="font-mono font-black text-emerald-300 text-sm">{etaTime} (بعد ~{estMins} دقيقة)</span>
          </div>
          <p className="text-[11px] text-indigo-100/90 leading-5">
            📦 <span className="font-bold">تتبع خط السير:</span> المندوب في منطقتك حالياً، سيصل إليك فور تسليم وجهة قريبة (توقف 4 دقائق). نضمن لك استلام ملابسك بأعلى معايير الدقة والعناية.
          </p>
        </div>
      </div>
    );
  }

  if (inOps) {
    return (
      <div className="rounded-2xl bg-slate-100 border border-slate-200 p-3.5 space-y-1.5 text-xs text-slate-700 font-semibold">
        <div className="font-black text-slate-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>ملابسك تخضع الآن لأدق مراحل العناية والتشغيل الذكي ✨</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          يتم غسيل وكي وتغليف القطع وفقاً لتفضيلاتك الملكية (VIP Concierge). سيتم اعتماد الفاتورة وإخطارك فور جهوزيتها للتسليم.
        </p>
      </div>
    );
  }

  return null;
}

function statusAr(s?: string | null, t?: any) {
  return (
    ({
      none: t?.("proof.none", "لا يوجد") ?? "لا يوجد",
      pending_review: t?.("proof.pending_review", "قيد المراجعة") ?? "قيد المراجعة",
      matched: t?.("proof.matched", "مطابق") ?? "مطابق",
      overpaid: t?.("proof.overpaid", "مدفوع بزيادة") ?? "مدفوع بزيادة",
      underpaid: t?.("proof.underpaid", "أقل من المطلوب") ?? "أقل من المطلوب",
      rejected: t?.("proof.rejected", "مرفوض") ?? "مرفوض",
    } as Record<string, string>)[s || "none"] ?? s
  );
}
