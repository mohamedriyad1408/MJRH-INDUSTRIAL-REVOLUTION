import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Camera, CheckCircle2, Clock, Truck, Package, Shirt, Sparkles, Inbox, Trash2, Send, Download, Upload, CreditCard } from "lucide-react";

export const Route = createFileRoute("/customer-portal")({
  head: () => ({ meta: [{ title: "بوابة العميل - MJRH" }] }),
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

type Order = { id: string; order_number: number; status: string; payment_status?: string; payment_method?: string | null; total: number; created_at: string; promised_delivery_at: string | null; invoice_finalized_at?: string | null; payment_proof_url?: string | null; customer_payment_amount?: number | null; payment_verification_status?: string | null; overpayment_amount?: number | null; pickup_status?: string | null; picked_up_at?: string | null; notes: string | null; order_items?: { name: string; qty: number; unit_price: number; line_total?: number }[] };
type ServiceItem = { id: string; name: string; price: number; service_type: string };
type CustomerInfo = { id: string; full_name: string; address?: string | null; lat?: number | null; lng?: number | null };
type Piece = { key: string; service_item_id: string; name: string; price: number; service_type: string; image_url?: string };

function CustomerPortal() {
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
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});

  async function verify() {
    if (!phone || phone.replace(/\D/g, "").length < 10) { toast.error("أدخل رقم هاتف صحيح"); return; }
    setLoading(true);
    const { data } = await (supabase as any).rpc("customer_portal_verify", { _phone: phone, _slug: tenantSlug }).maybeSingle();
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
    const { data } = await (supabase as any).rpc("customer_portal_orders", { _phone: phone, _slug: tenantSlug });
    setOrders((data ?? []) as any);
  }

  async function loadServices() {
    const { data } = await (supabase as any).rpc("customer_portal_services", { _phone: phone, _slug: tenantSlug });
    setServices(((data ?? []) as any[]).map((s) => ({ id: s.id, name: s.name, price: Number(s.price ?? 0), service_type: s.service_type })));
  }

  function addPiece(svc: ServiceItem) {
    setPieces((prev) => [{ key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, service_item_id: svc.id, name: svc.name, price: svc.price, service_type: svc.service_type }, ...prev]);
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
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>فاتورة #${order.order_number}</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:right}.total{font-size:22px;font-weight:900;color:#0f766e}.box{border:1px solid #ddd;border-radius:14px;padding:16px;margin-bottom:16px}</style></head><body><div class="box"><h1>فاتورة طلب #${order.order_number}</h1><p>العميل: ${customerName}</p><p>الهاتف: ${phone}</p><p>تاريخ الطلب: ${new Date(order.created_at).toLocaleString("ar-EG")}</p><p>تمت المراجعة: ${new Date(order.invoice_finalized_at).toLocaleString("ar-EG")}</p></div><table><thead><tr><th>الخدمة</th><th>العدد</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><p class="total">المطلوب: ${order.total} ج.م</p><script>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error("المتصفح منع فتح الفاتورة");
    w.document.write(html); w.document.close();
  }

  function detectAmountFromFilename(file: File) {
    const m = file.name.match(/(?:egp|ج|amount|مبلغ)?\s*(\d{2,7}(?:[.,]\d{1,2})?)/i);
    return m ? Number(m[1].replace(",", ".")) : null;
  }

  async function uploadPaymentProof(order: Order, file: File) {
    if (!order.invoice_finalized_at) return toast.error("استنى مراجعة واعتماد الفاتورة أولًا");
    const typedAmount = Number(paymentAmounts[order.id] || 0);
    const detected = detectAmountFromFilename(file);
    const amount = detected || typedAmount;
    if (!amount) return toast.error("اكتب المبلغ المدفوع أو ارفع صورة باسم يحتوي على المبلغ مثل instapay-250.jpg");
    setPayingOrderId(order.id);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `customer-payments/${order.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setPayingOrderId(null); return toast.error(error.message); }
    const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
    const { data: res, error: fnErr } = await supabase.functions.invoke("ocr-payment-proof", {
      body: {
        phone,
        slug: tenantSlug,
        orderId: order.id,
        proofUrl: data.publicUrl,
        typedAmount: amount,
      },
    });
    setPayingOrderId(null);
    if (fnErr || res?.ok === false) return toast.error(res?.error ?? fnErr?.message ?? "تعذر قراءة الإيصال");
    toast.success(res?.message ?? "تم رفع إثبات الدفع");
    loadOrders();
  }

  async function placeOrder() {
    if (!pieces.length && !notes) { toast.error("أضف قطعة واحدة أو ملاحظات على الأقل"); return; }
    setPlacing(true);
    const { data: ord, error } = await (supabase as any).rpc("customer_portal_create_order", {
      _phone: phone,
      _items: pieces.map((p) => ({ service_item_id: p.service_item_id, qty: 1, image_url: p.image_url ?? null })),
      _notes: notes || null,
      _image_urls: pieces.map((p) => p.image_url).filter(Boolean),
      _slug: tenantSlug,
    }).single();
    if (error) { setPlacing(false); return toast.error(error.message); }
    setPlacing(false);
    toast.success(`✅ تم إرسال طلبك #${ord.order_number}`);
    setPieces([]); setNotes("");
    setTab("orders");
    loadOrders();
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ccfbf1,#f8fafc_45%,#e0f2fe)] flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-sm shadow-2xl border-0 overflow-hidden">
          <div className="bg-gradient-to-br from-teal-700 to-slate-900 text-white p-8 text-center">
            <div className="text-6xl mb-3">👕</div>
            <h1 className="text-3xl font-black">بوابة العميل</h1>
            <p className="text-sm text-teal-100 mt-1">اطلب من بيتك وتابع طلبك</p>
          </div>
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">رقم هاتفك المسجل</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" className="text-center text-lg font-mono h-12" onKeyDown={(e) => e.key === "Enter" && verify()} />
            </div>
            <Button className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-lg font-black" onClick={verify} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "دخول"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const doneOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));
  const total = pieces.reduce((sum, p) => sum + Number(p.price), 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ccfbf1,#f8fafc_45%,#e0f2fe)] p-3" dir="rtl">
      <div className="max-w-lg mx-auto space-y-4 pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-teal-700 to-slate-950 text-white p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black">أهلاً، {customerName} 👋</h1>
              <p className="text-xs text-teal-100">{phone}</p>
              {customerInfo?.address && <p className="text-xs text-teal-100/80 mt-1 truncate">📍 {customerInfo.address}</p>}
            </div>
            <Button size="sm" variant="secondary" onClick={() => { setVerified(false); setPhone(""); }}>خروج</Button>
          </div>
        </div>

        <div className="flex gap-2 bg-white rounded-2xl p-1 shadow-sm sticky top-2 z-10">
          {[["orders", `طلباتي (${activeOrders.length})`], ["new", "طلب جديد +"]] .map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)} className={`flex-1 py-3 px-3 rounded-xl text-sm font-black transition-all ${tab === k ? "bg-teal-600 text-white shadow" : "text-slate-500"}`}>{l}</button>
          ))}
        </div>

        {tab === "orders" ? (
          <div className="space-y-3">
            {activeOrders.length === 0 && doneOrders.length === 0 && <Card><CardContent className="p-8 text-center text-slate-400">لا توجد طلبات بعد</CardContent></Card>}
            {activeOrders.map((o) => <OrderCard key={o.id} order={o} onDownloadInvoice={downloadInvoice} onUploadProof={uploadPaymentProof} paymentAmount={paymentAmounts[o.id] ?? ""} setPaymentAmount={(v) => setPaymentAmounts((m) => ({ ...m, [o.id]: v }))} paying={payingOrderId === o.id} />)}
            {doneOrders.length > 0 && <><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">الطلبات السابقة</p>{doneOrders.slice(0, 5).map((o) => <OrderCard key={o.id} order={o} onDownloadInvoice={downloadInvoice} onUploadProof={uploadPaymentProof} paymentAmount={paymentAmounts[o.id] ?? ""} setPaymentAmount={(v) => setPaymentAmounts((m) => ({ ...m, [o.id]: v }))} paying={payingOrderId === o.id} />)}</>}
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="shadow-sm border-0">
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-black text-lg text-slate-900">اختار القطع</h3>
                  <p className="text-xs text-slate-500">اضغط + لإضافة قطعة، ثم صورها من الكاميرا بجانبها.</p>
                </div>
                <div className="space-y-2">
                  {services.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between border rounded-2xl p-3 bg-white shadow-sm">
                      <div>
                        <div className="font-black text-sm">{svc.name}</div>
                        <div className="text-xs text-teal-600 font-bold">{svc.price} ج.م</div>
                      </div>
                      <button onClick={() => addPiece(svc)} className="w-11 h-11 rounded-full bg-teal-600 text-white flex items-center justify-center font-black text-xl shadow active:scale-95">+</button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-black text-lg">القطع المختارة ({pieces.length})</h3>
                {!pieces.length && <div className="rounded-2xl border border-dashed p-6 text-center text-slate-400">أضف قطعة من الخدمات بالأعلى</div>}
                {pieces.map((p) => (
                  <div key={p.key} className="grid grid-cols-[70px_1fr_auto] gap-3 items-center rounded-2xl border bg-white p-2 shadow-sm">
                    <label className="w-[70px] h-[70px] rounded-xl border bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer">
                      {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : uploadingKey === p.key ? <Loader2 className="w-6 h-6 animate-spin text-teal-600" /> : <Camera className="w-7 h-7 text-teal-600" />}
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPieceImage(p.key, e.target.files[0])} />
                    </label>
                    <div className="min-w-0">
                      <div className="font-black text-sm truncate">{p.name}</div>
                      <div className="text-xs text-teal-700 font-bold">{p.price} ج.م</div>
                      <div className="text-[11px] text-slate-400">{p.image_url ? "تم إضافة صورة" : "اضغط الكاميرا لتصوير القطعة"}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setPieces((rows) => rows.filter((x) => x.key !== p.key))}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </div>
                ))}
                <div>
                  <label className="text-sm font-bold block mb-1">ملاحظات (اختياري)</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="أي ملاحظات على الطلب..." />
                </div>
                <div className="rounded-2xl bg-teal-50 p-3 text-sm flex justify-between font-black text-teal-900"><span>الإجمالي المتوقع</span><span>{total} ج.م</span></div>
                <Button className="w-full h-12 bg-teal-600 hover:bg-teal-700 font-black text-lg" onClick={placeOrder} disabled={placing}>
                  {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 ms-1" /> إرسال الطلب</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onDownloadInvoice, onUploadProof, paymentAmount, setPaymentAmount, paying }: { order: Order; onDownloadInvoice: (o: Order) => void; onUploadProof: (o: Order, f: File) => void; paymentAmount: string; setPaymentAmount: (v: string) => void; paying: boolean }) {
  const idx = ORDER_STEPS.findIndex((s) => s.key === order.status);
  const step = ORDER_STEPS[idx] ?? ORDER_STEPS[0];
  return (
    <Card className="shadow-sm border-0 rounded-3xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-black">طلب #{order.order_number}</div>
            <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ar-EG")}</div>
          </div>
          <Badge style={{ background: step.color, color: "#fff" }}>{step.label}</Badge>
        </div>
        {order.status !== "delivered" && order.status !== "cancelled" && <div className="flex gap-1">{ORDER_STEPS.slice(0, -1).map((s, i) => <div key={s.key} className={`h-1.5 flex-1 rounded-full transition-all ${i <= idx ? "bg-teal-500" : "bg-slate-200"}`} />)}</div>}
        <CustomerOrderHint order={order} />
        {order.order_items?.length ? <div className="text-xs text-slate-500 space-y-0.5">{order.order_items.slice(0, 3).map((it, i) => <div key={i}>{it.qty}× {it.name}</div>)}</div> : null}
        <div className="flex justify-between items-center pt-1 border-t"><span className="text-sm text-slate-500">الإجمالي</span><span className="font-black text-teal-700">{order.total} ج.م</span></div>
        {order.invoice_finalized_at ? <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2"><Badge className="bg-emerald-600">الفاتورة تمت مراجعتها</Badge><Button size="sm" variant="outline" onClick={() => onDownloadInvoice(order)}><Download className="w-4 h-4 ms-1" />تحميل الفاتورة</Button></div>
          {order.payment_status === "paid" ? <div className="text-sm font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />تم تسجيل الدفع{Number(order.overpayment_amount ?? 0) > 0 ? ` — الزائد ${order.overpayment_amount} ج.م بقشيش للمندوب` : ""}</div> : <div className="space-y-2">
            <div className="text-xs text-slate-500">ادفع InstaPay ثم ارفع صورة الإيصال. لو دفعت زيادة، الزائد يتسجل بقشيش للمندوب.</div>
            <div className="grid grid-cols-[1fr_auto] gap-2"><Input type="number" placeholder="المبلغ المدفوع" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /><Button asChild disabled={paying}><label className="cursor-pointer">{paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 ms-1" />رفع الإيصال</>}<input hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUploadProof(order, e.target.files[0])} /></label></Button></div>
            {order.payment_proof_url && <div className="text-xs text-amber-700">تم رفع إيصال سابق — الحالة: {statusAr(order.payment_verification_status)}</div>}
          </div>}
        </div> : <div className="rounded-xl bg-amber-50 border border-amber-100 p-2 text-xs text-amber-700">الفاتورة قيد المراجعة. الدفع يظهر بعد اعتماد الفاتورة.</div>}
        {order.promised_delivery_at && <div className="text-xs text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" /> متوقع: {new Date(order.promised_delivery_at).toLocaleString("ar-EG")}</div>}
      </CardContent>
    </Card>
  );
}

function CustomerOrderHint({ order }: { order: Order }) {
  if (order.pickup_status === "pending") return <div className="rounded-xl bg-amber-50 border border-amber-100 p-2 text-xs text-amber-700">طلبك اتسجل، وفي انتظار تعيين مندوب للاستلام من عنوانك.</div>;
  if (order.pickup_status === "assigned") return <div className="rounded-xl bg-blue-50 border border-blue-100 p-2 text-xs text-blue-700">تم تعيين مندوب، وهو في طريقه لاستلام الطلب.</div>;
  if (order.pickup_status === "converted" && order.status === "received") return <div className="rounded-xl bg-teal-50 border border-teal-100 p-2 text-xs text-teal-700">تم استلام الطلب من المندوب ودخل الاستقبال.</div>;
  if (["cleaning", "ironing", "packing"].includes(order.status)) return <div className="rounded-xl bg-slate-50 border p-2 text-xs text-slate-600">طلبك داخل التشغيل الآن. سيتم اعتماد الفاتورة بعد المراجعة النهائية.</div>;
  if (order.status === "ready") return <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2 text-xs text-emerald-700">طلبك جاهز للتسليم. تابع الدفع أو انتظر المندوب.</div>;
  if (order.status === "out_for_delivery") return <div className="rounded-xl bg-orange-50 border border-orange-100 p-2 text-xs text-orange-700">طلبك خرج للتسليم مع المندوب.</div>;
  return null;
}

function statusAr(s?: string | null) { return ({ none: "لا يوجد", pending_review: "قيد المراجعة", matched: "مطابق", overpaid: "مدفوع بزيادة", underpaid: "أقل من المطلوب", rejected: "مرفوض" } as any)[s || "none"] ?? s; }
