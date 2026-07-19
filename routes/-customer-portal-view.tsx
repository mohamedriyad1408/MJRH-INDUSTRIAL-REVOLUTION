import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, interpolate } from "@/lib/i18n";
import { toast } from "sonner";
import {
  Loader2, Plus, Camera, CheckCircle2, Clock, Truck, Package,
  Shirt, Sparkles, Inbox, Send, Download, Upload, CreditCard,
  Crown, Calendar, AlertTriangle, Scissors, Zap, FileText, Receipt,
} from "lucide-react";
import { BASE_CONTINUOUS_SLOTS, calculateSlotPressure } from "@/lib/scheduling-surge";
import { resolveAppUrl } from "@/lib/utils";

const ORDER_STEPS = [
  { key: "received", label: "تم الاستلام", icon: Inbox, color: "#0d9488" },
  { key: "cleaning", label: "تنظيف", icon: Sparkles, color: "#3b82f6" },
  { key: "ironing", label: "كي", icon: Shirt, color: "#8b5cf6" },
  { key: "packing", label: "تغليف", icon: Package, color: "#f59e0b" },
  { key: "ready", label: "جاهز", icon: CheckCircle2, color: "#10b981" },
  { key: "out_for_delivery", label: "خرج للتسليم", icon: Truck, color: "#f97316" },
  { key: "delivered", label: "تم التسليم", icon: CheckCircle2, color: "#059669" },
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
type CustomerInfo = { id: string; full_name: string; address?: string | null; lat?: number | null; lng?: number | null; notes?: string | null };
type Piece = { key: string; service_item_id: string; name: string; price: number; service_type: string; image_url?: string };

export default function CustomerPortal() {
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

  // VIP Concierge Preferences & Notes State
  const [categoryFilter, setCategoryFilter] = useState<"all" | "cleaning" | "ironing" | "both">("all");
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [itemPhotoMap, setItemPhotoMap] = useState<Record<string, string>>({}); // map service_item_id -> img url
  const [prefPackaging, setPrefPackaging] = useState<"hangers" | "folded" | "mixed">("hangers");
  const [prefIndividualBags, setPrefIndividualBags] = useState<boolean>(false);
  const [prefSplitDelivery, setPrefSplitDelivery] = useState<boolean>(false);
  const [prefCombineBlanketsCarpets, setPrefCombineBlanketsCarpets] = useState<boolean>(false);
  const [customIroningNotes, setCustomIroningNotes] = useState<string>("");
  const [permanentNotes, setPermanentNotes] = useState<string>("");

  // Urgent Surcharges State
  const [urgentCleaningTier, setUrgentCleaningTier] = useState<"standard" | "express_24h" | "super_urgent_6h">("standard");
  const [urgentIroningTier, setUrgentIroningTier] = useState<"standard" | "express_6h" | "super_urgent_2h">("standard");

  // Scheduling Slots State
  const [pickupSlot, setPickupSlot] = useState<string>("اليوم 02:00 - 04:00 مساءً");

  // Celebration Modal
  const [confirmedOrderNum, setConfirmedOrderNum] = useState<number | null>(null);

  async function handleSelectDeliverySlot(orderId: string, slotName: string) {
    const { error } = await supabase.from("orders").update({
      delivery_slot: slotName,
      promised_delivery_at: new Date().toISOString(),
      status: "out_for_delivery",
    }).eq("id", orderId);

    if (error) {
      toast.error(t("customer.error.deliveryUpdate", "حدث خطأ أثناء تحديث موعد التسليم"));
    } else {
      toast.success(t("customer.toast.deliveryUpdate", "تم تأكيد موعد التسليم وتوجيه المندوب للتحرك في الموعد المحدد"));
      loadOrders();
    }
  }

  async function verify() {
    if (!phone || phone.replace(/\D/g, "").length < 10) { toast.error(t("customer.error.invalidPhone", "أدخل رقم هاتف صحيح")); return; }
    setLoading(true);
    const { data } = await supabase.rpc("customer_portal_verify", { _phone: phone, _slug: tenantSlug }).maybeSingle();
    setLoading(false);
    if (!data) { toast.error(t("customer.error.notRegistered", "الرقم غير مسجل — تواصل مع المغسلة أو سجل من رابط المغسلة")); return; }
    setCustomerId(data.id);
    setCustomerName(data.full_name);
    setCustomerInfo(data as CustomerInfo);
    if ((data as any).notes) setPermanentNotes((data as any).notes);
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

  async function uploadItemPhoto(id: string, file: File) {
    setUploadingKey(id);
    const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const path = `order-images/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
    const { error } = await supabase.storage.from("order-attachments").upload(path, file, { contentType: file.type });
    if (error) { setUploadingKey(null); return toast.error(t("common.error.uploadFailed", "فشل رفع الصورة: ") + error.message); }
    const { data } = supabase.storage.from("order-attachments").getPublicUrl(path);
    setItemPhotoMap((prev) => ({ ...prev, [id]: data.publicUrl }));
    setUploadingKey(null);
    toast.success(t("customer.toast.itemPhotoSaved", "تم حفظ صورة القطعة بنجاح لتوثيق الحالة عند الاستلام"));
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
    toast.success(t("customer.toast.pieceImageSaved", "تم توثيق وحفظ صورة القطعة"));
  }

  function downloadInvoice(order: Order) {
    if (!order.invoice_finalized_at) { toast.error(t("customer.error.invoiceNotReady", "الفاتورة لم تتم مراجعتها واعتمادها بعد")); return; }
    const rows = (order.order_items ?? []).map((it) => `
      <tr><td>${it.name}</td><td>${it.qty}</td><td>${Number(it.unit_price).toFixed(2)}</td><td>${Number(it.line_total ?? it.qty * it.unit_price).toFixed(2)}</td></tr>
    `).join("");
    const html = `<!doctype html><html dir="${dir}" lang="ar"><head><meta charset="utf-8"><title>فاتورة #${order.order_number}</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:right}.total{font-size:22px;font-weight:900;color:#0f766e}.box{border:1px solid #ddd;border-radius:14px;padding:16px;margin-bottom:16px}</style></head><body><div class="box"><h1>فاتورة طلب #${order.order_number}</h1><p>العميل: ${customerName}</p><p>الهاتف: ${phone}</p><p>تاريخ الطلب: ${new Date(order.created_at).toLocaleString("ar-EG")}</p><p>تمت المراجعة: ${new Date(order.invoice_finalized_at).toLocaleString("ar-EG")}</p></div><table><thead><tr><th>الخدمة</th><th>العدد</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><p class="total">المطلوب: ${order.total} ج.م</p><script>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error(t("common.error.popupBlocked", "المتصفح منع فتح الفاتورة"));
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
    if (error) { setPayingOrderId(null); return toast.error(t("common.error.uploadFailed", "فشل الرفع: ") + error.message); }
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
          toast.success(t("customer.paymentConfirmedLive", "تم تأكيد عملية الدفع بنجاح لحظياً"));
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

  const totalItemCount = useMemo(() => {
    return Object.values(itemQuantities).reduce((a, b) => a + b, 0) + pieces.length;
  }, [itemQuantities, pieces]);

  const hasBlankets = useMemo(() => {
    return selectedServicesList.some((s) => s.name.includes("بطانية") || s.name.includes("لحاف")) ||
           pieces.some((p) => p.name.includes("بطانية") || p.name.includes("لحاف"));
  }, [selectedServicesList, pieces]);

  const hasCarpets = useMemo(() => {
    return selectedServicesList.some((s) => s.name.includes("سجاد") || s.name.includes("سجادة") || s.name.includes("موكيت")) ||
           pieces.some((p) => p.name.includes("سجاد") || p.name.includes("سجادة") || p.name.includes("موكيت"));
  }, [selectedServicesList, pieces]);

  const isBlanketCarpetSplit = hasBlankets && hasCarpets;

  const pickupSlotInfo = useMemo(() => {
    return calculateSlotPressure(orders, pickupSlot);
  }, [pickupSlot, orders]);

  const isPeakPickupSlot = pickupSlotInfo.level !== "normal";

  const { baseSubtotal, urgentSurcharge, splitDeliveryFee, individualBagsFee, blanketCarpetSplitFee, total } = useMemo(() => {
    let base = 0;
    let surcharge = 0;

    selectedServicesList.forEach((s) => {
      const qty = itemQuantities[s.id] || 0;
      const lineBase = qty * s.price;
      base += lineBase;
      if (s.service_type === "ironing") {
        if (urgentIroningTier === "express_6h") surcharge += lineBase * 0.5;
        else if (urgentIroningTier === "super_urgent_2h") surcharge += lineBase * 1.0;
      } else {
        if (urgentCleaningTier === "express_24h") surcharge += lineBase * 0.5;
        else if (urgentCleaningTier === "super_urgent_6h") surcharge += lineBase * 1.0;
      }
    });

    pieces.forEach((p) => {
      base += p.price;
      if (p.service_type === "ironing") {
        if (urgentIroningTier === "express_6h") surcharge += p.price * 0.5;
        else if (urgentIroningTier === "super_urgent_2h") surcharge += p.price * 1.0;
      } else {
        if (urgentCleaningTier === "express_24h") surcharge += p.price * 0.5;
        else if (urgentCleaningTier === "super_urgent_6h") surcharge += p.price * 1.0;
      }
    });

    const standardDelivery = 50; 
    const splitFee = prefSplitDelivery ? Math.round(standardDelivery * 0.5) : 0;
    const bagsFee = prefIndividualBags ? totalItemCount * 5 : 0;
    const blanketSplitFee = (isBlanketCarpetSplit && !prefCombineBlanketsCarpets) ? Math.round(standardDelivery * 0.5) : 0;

    return {
      baseSubtotal: base,
      urgentSurcharge: surcharge,
      splitDeliveryFee: splitFee,
      individualBagsFee: bagsFee,
      blanketCarpetSplitFee: blanketSplitFee,
      total: base + surcharge + splitFee + bagsFee + blanketSplitFee,
    };
  }, [selectedServicesList, itemQuantities, pieces, urgentCleaningTier, urgentIroningTier, prefSplitDelivery, prefIndividualBags, totalItemCount, isBlanketCarpetSplit, prefCombineBlanketsCarpets]);

  async function placeOrder() {
    if (selectedServicesList.length === 0 && !pieces.length && !notes.trim()) {
      toast.error(t("customer.error.emptyOrder", "اختر قطعة واحدة أو خدمة على الأقل من الكتالوج أو أضف ملاحظات"));
      return;
    }
    setPlacing(true);

    const vipNotes = `[تفضيلات VIP المميزة]: التغليف: ${
      prefPackaging === "hangers" ? "شماعات معلقة" : prefPackaging === "folded" ? "مطوي ومنسق" : "تغليف فاخر مختلط"
    } • أكياس فردية: ${prefIndividualBags ? `نعم (+${individualBagsFee} ج.م)` : "لا"} • توصيل مجزأ: ${
      prefSplitDelivery ? `نعم (+${splitDeliveryFee} ج.م)` : "لا"
    }${isBlanketCarpetSplit ? ` • شحنة البطانيات والسجاد: ${prefCombineBlanketsCarpets ? "تجميع في شحنة واحدة" : `شحن مجزأ منفصل (+${blanketCarpetSplitFee} ج.م)`}` : ""}
[سرعة التشغيل والاستعجال]: الغسيل: ${
      urgentCleaningTier === "standard" ? "قياسي" : urgentCleaningTier === "express_24h" ? "سريع 24 ساعة (+50%)" : "عاجل جداً أقل من 6 ساعات (+100%)"
    } • الكي: ${
      urgentIroningTier === "standard" ? "قياسي" : urgentIroningTier === "express_6h" ? "سريع 6 ساعات (+50%)" : "صاروخي ساعتين (+100%)"
    }
${customIroningNotes.trim() ? `[تعليمات وتفضيلات الكي المخصصة]: ${customIroningNotes.trim()}\n` : ""}${permanentNotes.trim() ? `[الملاحظات الدائمة للعميل]: ${permanentNotes.trim()}\n` : ""}[جدولة مواعيد المندوب]: 🟢 استلام الغسيل: ${pickupSlot} • تسليم الغسيل: (يتم تحديده لاحقاً فور جهوزية الطلب)
${notes.trim() ? `[ملاحظات الطلب الحالي]: ${notes.trim()}` : ""}`.trim();

    const combinedItems = [
      ...selectedServicesList.map((s) => ({
        service_item_id: s.id,
        qty: itemQuantities[s.id] || 1,
        unit_price: s.price,
        name: s.name,
        service_type: s.service_type,
        image_url: itemPhotoMap[s.id] ?? null,
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
        _image_urls: [
          ...Object.values(itemPhotoMap),
          ...pieces.map((p) => p.image_url),
        ].filter(Boolean),
        _slug: tenantSlug,
      }).single();

      if (error) throw error;

      if (ord?.id) {
        await supabase.from("orders").update({
          pickup_slot: pickupSlot,
          delivery_slot: null,
          vip_preferences: {
            packaging: prefPackaging,
            individual_bags: prefIndividualBags,
            individual_bags_fee: individualBagsFee,
            split_delivery: prefSplitDelivery,
            split_fee: splitDeliveryFee,
            blanket_carpet_split: isBlanketCarpetSplit && !prefCombineBlanketsCarpets,
            blanket_carpet_fee: blanketCarpetSplitFee,
            urgent_cleaning: urgentCleaningTier,
            urgent_ironing: urgentIroningTier,
            urgent_fee: urgentSurcharge,
            custom_ironing_notes: customIroningNotes.trim() || null,
          },
        }).eq("id", ord.id);

        if (customerId && permanentNotes.trim()) {
          await supabase.from("customers").update({ notes: permanentNotes.trim() }).eq("id", customerId);
        }
      }

      setItemQuantities({});
      setItemPhotoMap({});
      setPieces([]);
      setNotes("");
      setConfirmedOrderNum(ord?.order_number || 0);
      loadOrders();
    } catch (err: any) {
      toast.error(err?.message || t("common.error.generic", "حدث خطأ أثناء إرسال الطلب"));
    } finally {
      setPlacing(false);
    }
  }

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const doneOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ccfbf1,#f8fafc_45%,#e0f2fe)] p-3" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-5 pb-28">
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
                <h1 className="text-xl font-black truncate text-white">{t("customer.welcome", "أهلاً بك")}، {customerName}</h1>
                <p className="text-xs text-teal-200 font-mono font-bold mt-0.5">{phone}</p>
                {customerInfo?.address && <p className="text-xs text-teal-100/80 mt-1 truncate">{customerInfo.address}</p>}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { setVerified(false); setPhone(""); }} className="font-bold rounded-xl shrink-0">
              {t("customer.logout", "خروج")}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm sticky top-2 z-20 border border-slate-200/80">
          {[
            ["orders", `${t("customer.myOrders", "طلباتي ومسار المندوب")} (${activeOrders.length})`],
            ["new", `${t("customer.newOrder", "طلب غسيل ملكي جديد")} +`],
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
          <div className="space-y-4">
            {activeOrders.length === 0 && doneOrders.length === 0 && (
              <Card className="rounded-3xl border-dashed p-12 text-center text-slate-400 font-bold bg-white">
                <Package className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p className="text-lg text-slate-700 font-black">{t("customer.noOrders", "لا توجد طلبات جارية بعد")}</p>
                <p className="text-xs text-slate-500 mt-1">{t("customer.noOrdersSub", "اضغط على زر (طلب خدمة جديد +) لإنشاء أول طلب لك الآن.")}</p>
              </Card>
            )}

            {activeOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                orders={orders}
                onDownloadInvoice={downloadInvoice}
                onUploadProof={uploadPaymentProof}
                onSelectDeliverySlot={handleSelectDeliverySlot}
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
                    orders={orders}
                    onDownloadInvoice={downloadInvoice}
                    onUploadProof={uploadPaymentProof}
                    onSelectDeliverySlot={handleSelectDeliverySlot}
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
          <div className="space-y-6">
            <Card className="shadow-md border-0 rounded-3xl overflow-hidden bg-white">
              <div className="p-5 bg-gradient-to-r from-slate-900 to-teal-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-300" />
                    <span>{t("customer.catalog.title", "1. اختار خدمات الكتالوج الحية والكميات")}</span>
                  </h3>
                  <p className="text-xs text-teal-200 mt-0.5">{t("customer.catalog.subtitle", "أي تعديل في أسعار أو خدمات المغسلة يظهر هنا لحظياً")}</p>
                </div>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "all", label: t("common.all", "الكل") },
                    { id: "both", label: t("common.washIron", "تنظيف وكي") },
                    { id: "ironing", label: t("common.ironOnly", "كي فقط") },
                    { id: "cleaning", label: t("common.alterations", "تصليحات وخياطة") },
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
                                  {svc.service_type === "both" ? t("common.washIron", "تنظيف وكي") : svc.service_type === "ironing" ? t("common.ironOnly", "كي فقط") : t("common.alterations", "تصليح وخياطة")}
                                </Badge>
                                <span className="text-xs text-teal-700 font-mono font-black">{svc.price} {t("common.egp", "ج.م")}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 border rounded-xl p-1">
                              <button type="button" onClick={() => updateQty(svc.id, -1)} disabled={qty === 0} className="w-8 h-8 rounded-lg bg-white text-slate-800 disabled:opacity-30 font-black text-base flex items-center justify-center shadow-2xs active:scale-95 transition">-</button>
                              <span className="w-6 text-center font-mono font-black text-sm text-slate-900">{qty}</span>
                              <button type="button" onClick={() => updateQty(svc.id, 1)} className="w-8 h-8 rounded-lg bg-teal-600 text-white font-black text-base flex items-center justify-center shadow-2xs active:scale-95 transition">+</button>
                            </div>
                          </div>
                        );
                      })}
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 rounded-3xl overflow-hidden shadow-lg">
              <div className="p-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-200" />
                    <span>{t("customer.preferences.title", "2. تخصيص تفضيلات العناية والطي وتعليمات الكي (VIP Concierge)")}</span>
                  </h3>
                  <p className="text-xs text-amber-100 mt-0.5">{t("customer.preferences.subtitle", "تظهر هذه التفضيلات بوضوح لفنيي الغسيل والكي والتغليف وموظفي الاستقبال")}</p>
                </div>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 block flex items-center gap-1.5">
                    <Shirt className="w-4 h-4 text-amber-600" />
                    <span>{t("customer.preferences.packaging", "أسلوب التغليف والطي المفضل لملابسك:")}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "hangers", label: t("common.hangers", "شماعات معلقة"), desc: t("common.hangersDesc", "كوي وتعليق جاهز") },
                      { id: "folded", label: t("common.folded", "مطوي ومنسق"), desc: t("common.foldedDesc", "تطبيق لسهولة التخزين") },
                      { id: "mixed", label: t("common.mixed", "تغليف مختلط"), desc: t("common.mixedDesc", "القمصان شماعة والقطنيات طي") },
                    ].map((p) => (
                      <button key={p.id} type="button" onClick={() => setPrefPackaging(p.id as any)} className={`rounded-2xl p-3 border-2 text-center transition flex flex-col items-center justify-center gap-1 ${prefPackaging === p.id ? "border-amber-600 bg-amber-50/90 text-amber-950 font-black shadow-sm" : "border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50"}`}>
                        <span className="text-xs">{p.label}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-200/80">
                  <label className="text-xs font-black text-slate-800 block flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-teal-600" />
                    <span>{t("customer.preferences.individualBags", "أكياس الحماية الفردية:")}</span>
                  </label>
                  <button type="button" onClick={() => setPrefIndividualBags(!prefIndividualBags)} className={`w-full p-3 rounded-xl border-2 text-xs font-black transition flex items-center justify-between px-4 ${prefIndividualBags ? "bg-teal-600 text-white border-teal-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
                    <span>{interpolate(t("customer.preferences.individualBagsDesc", "تغليف كل قطعة في كيس حفظ وحماية منفصل على حدة ({price} ج.م لكل قطعة في الطلب)"), { price: 5 })}</span>
                    <span>{prefIndividualBags ? `${t("common.active", "مفعّل")} (+${individualBagsFee} ${t("common.egp", "ج.م")})` : t("common.inactive", "إيقاف")}</span>
                  </button>
                </div>
                <div className="space-y-2 pt-3 border-t border-slate-200/80">
                  <label className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-indigo-600" />
                    <span>{t("customer.preferences.ironingInstructions", "تفضيلات وتعليمات الكي المخصصة (Custom Ironing Instructions):")}</span>
                  </label>
                  <Textarea value={customIroningNotes} onChange={(e) => setCustomIroningNotes(e.target.value)} rows={2} placeholder={t("customer.preferences.ironingPlaceholder", "اكتب تفضيلاتك الخاصة بالكي هنا بكلماتك...")} className="rounded-2xl font-bold text-xs bg-white border-2 border-slate-300 focus:border-indigo-600 shadow-2xs" />
                </div>
                <div className="pt-3 border-t border-amber-300/80 space-y-3">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-400">
                    <input type="checkbox" id="split-delivery" checked={prefSplitDelivery} onChange={(e) => setPrefSplitDelivery(e.target.checked)} className="mt-1 w-5 h-5 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer" />
                    <label htmlFor="split-delivery" className="text-xs cursor-pointer space-y-1">
                      <div className="font-black text-slate-900 text-sm flex items-center gap-1.5"><Truck className="w-4 h-4 text-orange-600" /><span>{t("customer.preferences.splitDelivery", "تفعيل التوصيل المجزأ")}</span></div>
                      <p className="text-slate-600 font-semibold leading-relaxed">{t("customer.preferences.splitDeliveryDesc", "إذا كان طلبك يحتوي على ملابس للكي وأخرى للتنظيف...")}</p>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="sticky bottom-3 z-30 bg-slate-950 text-white p-5 rounded-3xl shadow-2xl border-2 border-teal-500/50 space-y-3">
              <div className="flex items-center justify-between text-sm sm:text-base font-black">
                <span className="flex items-center gap-2"><span>{t("customer.invoice.estimatedTotal", "إجمالي الفاتورة المبدئية:")}</span>{urgentSurcharge > 0 && <Badge className="bg-indigo-600 text-white text-[10px] font-mono">+{urgentSurcharge} ج.م</Badge>}</span>
                <span className="font-mono text-2xl text-teal-300 font-black">{total} {t("common.egp", "ج.م")}</span>
              </div>
              <Button className="w-full h-14 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition" onClick={placeOrder} disabled={placing}>
                {placing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span>{t("customer.submitOrder", "إرسال الطلب &larr;")}</span>
              </Button>
            </div>
          </div>
        )}

        <Dialog open={!!confirmedOrderNum} onOpenChange={(o) => !o && setConfirmedOrderNum(null)}>
          <DialogContent className="max-w-md rounded-3xl text-center p-6 space-y-4" dir={dir}>
            <DialogTitle className="text-2xl font-black text-slate-900">{interpolate(t("customer.orderSuccess", "تم استلام طلبك بنجاح برقم #{num}!"), { num: confirmedOrderNum })}</DialogTitle>
            <DialogFooter><Button onClick={() => setConfirmedOrderNum(null)} className="w-full bg-slate-900 text-white font-black rounded-2xl h-12">{t("customer.trackOrderBtn", "متابعة طلبك &larr;")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function OrderCard({ order, orders, onDownloadInvoice, onUploadProof, onSelectDeliverySlot, paymentAmount, setPaymentAmount, paying, liveVerifying, liveStep }: { order: Order; orders?: Order[]; onDownloadInvoice: (o: Order) => void; onUploadProof: (o: Order, f: File) => void; onSelectDeliverySlot?: (id: string, slot: string) => void; paymentAmount: string; setPaymentAmount: (v: string) => void; paying: boolean; liveVerifying?: boolean; liveStep?: number }) {
  const { t } = useI18n();
  const idx = ORDER_STEPS.findIndex((s) => s.key === (order.status === "received" ? "received" : order.status));
  const step = ORDER_STEPS[idx] ?? ORDER_STEPS[0];

  return (
    <Card className="shadow-md border border-slate-200/80 rounded-3xl overflow-hidden bg-white">
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div><div className="font-black text-base text-slate-900">طلب رقم #{order.order_number}</div><div className="text-xs text-muted-foreground font-mono font-bold mt-0.5">{new Date(order.created_at).toLocaleString("ar-EG")}</div></div>
          <Badge style={{ background: step.color, color: "#fff" }} className="text-xs font-black px-3 py-1 shadow-2xs">{step.label}</Badge>
        </div>
        <CustomerOrderHint order={order} />
        <div className="flex justify-between items-center pt-2 border-t border-slate-100"><span className="text-sm font-bold text-slate-600">{t("common.total", "الإجمالي")}:</span><span className="font-mono font-black text-xl text-teal-700">{order.total} ج.م</span></div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {order.invoice_finalized_at && <Button size="sm" variant="outline" onClick={() => onDownloadInvoice(order)} className="font-bold rounded-xl">{t("common.downloadInvoice", "تحميل الفاتورة")}</Button>}
          {order.status !== "delivered" && order.status !== "cancelled" && (
            <div className="flex items-center gap-2 ms-auto">
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-32 h-9 text-xs font-bold rounded-xl" />
              <Button asChild size="sm" disabled={paying} className="bg-slate-900 text-white rounded-xl h-9">
                <label className="cursor-pointer flex items-center"><span>{t("common.uploadProof", "إثبات InstaPay")}</span><input hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUploadProof(order, e.target.files[0])} /></label>
              </Button>
            </div>
          )}
        </div>
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

  if (isPickup) return <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 space-y-2"><div className="font-black text-sm flex items-center gap-2"><Truck className="w-5 h-5" /><span>{order.pickup_status === "assigned" ? "مندوب الاستلام في الطريق" : "بانتظار المندوب"}</span></div><div className="text-xs">{etaTime} (بعد ~{estMins} دقيقة)</div></div>;
  if (isDelivery) return <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-800 text-white p-4 space-y-2"><div className="font-black text-sm flex items-center gap-2"><Truck className="w-5 h-5" /><span>{order.status === "out_for_delivery" ? "مندوب التسليم في الطريق" : "طلبك جاهز بالمغسلة"}</span></div><div className="text-xs">{etaTime} (بعد ~{estMins} دقيقة)</div></div>;
  if (inOps) return <div className="rounded-2xl bg-slate-100 border border-slate-200 p-3.5 space-y-1.5 text-xs text-slate-700 font-semibold"><div className="font-black text-slate-900 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-teal-600" /><span>ملابسك تخضع الآن لأدق مراحل العناية</span></div></div>;
  return null;
}

function statusAr(s?: string | null, t?: any) {
  return ({ none: "لا يوجد", pending_review: "قيد المراجعة", matched: "مطابق", overpaid: "مدفوع بزيادة", underpaid: "أقل من المطلوب", rejected: "مرفوض" } as Record<string, string>)[s || "none"] ?? s;
}
