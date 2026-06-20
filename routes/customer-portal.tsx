import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Camera, CheckCircle2, Clock, Truck, Package, Shirt, Sparkles, Inbox } from "lucide-react";

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

type Order = { id: string; order_number: number; status: string; total: number; created_at: string; promised_delivery_at: string | null; notes: string | null; order_items?: { name: string; qty: number; unit_price: number }[] };
type ServiceItem = { id: string; name: string; price: number; service_type: string };

function CustomerPortal() {
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [tab, setTab] = useState<"orders" | "new">("orders");
  const [loading, setLoading] = useState(false);

  // New order state
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);

  async function verify() {
    if (!phone || phone.length < 10) { toast.error("أدخل رقم هاتف صحيح"); return; }
    setLoading(true);
    const { data } = await supabase.from("customers").select("id, full_name").eq("phone", phone).maybeSingle();
    setLoading(false);
    if (!data) { toast.error("الرقم غير مسجل — تواصل مع المغسلة"); return; }
    setCustomerId(data.id);
    setCustomerName(data.full_name);
    setVerified(true);
    loadOrders(data.id);
    loadServices();
  }

  async function loadOrders(cid: string) {
    const { data } = await supabase.from("orders").select("id,order_number,status,total,created_at,promised_delivery_at,notes,order_items(name,qty,unit_price)").eq("customer_id", cid).order("created_at", { ascending: false }).limit(20);
    setOrders((data ?? []) as any);
  }

  async function loadServices() {
    const { data } = await supabase.from("service_items").select("id,name,price,service_type").eq("is_active", true).order("name");
    setServices((data ?? []) as any);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files.slice(0, 5)) {
      const path = `order-images/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("order-attachments").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("order-attachments").getPublicUrl(path);
        setImages((prev) => [...prev, urlData.publicUrl]);
      }
    }
    toast.success("تم رفع الصور");
  }

  async function placeOrder() {
    const items = Object.entries(cart).filter(([, qty]) => qty > 0);
    if (items.length === 0 && !notes) { toast.error("أضف خدمات أو ملاحظات على الأقل"); return; }
    setPlacing(true);
    const cartItems = items.map(([id, qty]) => {
      const svc = services.find((s) => s.id === id)!;
      return { service_item_id: id, name: svc.name, qty, unit_price: svc.price, line_total: qty * svc.price, service_type: svc.service_type as any };
    });
    const subtotal = cartItems.reduce((s, i) => s + i.line_total, 0);
    const { data: ord, error } = await supabase.from("orders").insert({
      customer_id: customerId!, order_type: "walk_in", status: "received",
      subtotal, total: subtotal, notes: notes || null, created_by: customerId!,
    }).select("id,order_number").single();
    if (error) { setPlacing(false); return toast.error(error.message); }
    if (cartItems.length) {
      await supabase.from("order_items").insert(cartItems.map((i) => ({ ...i, order_id: ord.id })));
    }
    if (images.length) {
      await  (supabase as any).from("order_attachments").insert(images.map((url) => ({ order_id: ord.id, url, uploaded_by: customerId!, label: "صورة من العميل" })));
    }
    setPlacing(false);
    toast.success(`✅ تم إرسال طلبك #${ord.order_number}`);
    setCart({}); setNotes(""); setImages([]);
    setTab("orders");
    loadOrders(customerId!);
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="p-8 space-y-5">
            <div className="text-center">
              <div className="text-5xl mb-3">👕</div>
              <h1 className="text-2xl font-black text-teal-800">بوابة العميل</h1>
              <p className="text-sm text-slate-500 mt-1">MJRH — نظام إدارة المغاسل</p>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">رقم هاتفك المسجل</label>
              <Input
                value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx" className="text-center text-lg font-mono"
                onKeyDown={(e) => e.key === "Enter" && verify()}
              />
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={verify} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "دخول"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const doneOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 p-4" dir="rtl">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-teal-800">أهلاً، {customerName} 👋</h1>
            <p className="text-xs text-slate-500">{phone}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setVerified(false); setPhone(""); }}>خروج</Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
          {[["orders", `طلباتي (${activeOrders.length})`], ["new", "طلب جديد +"]] .map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${tab === k ? "bg-teal-600 text-white shadow" : "text-slate-500"}`}>{l}</button>
          ))}
        </div>

        {tab === "orders" ? (
          <div className="space-y-3">
            {activeOrders.length === 0 && doneOrders.length === 0 && (
              <Card><CardContent className="p-8 text-center text-slate-400">لا توجد طلبات بعد</CardContent></Card>
            )}
            {activeOrders.map((o) => <OrderCard key={o.id} order={o} />)}
            {doneOrders.length > 0 && (
              <>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">الطلبات السابقة</p>
                {doneOrders.slice(0, 5).map((o) => <OrderCard key={o.id} order={o} />)}
              </>
            )}
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-base">اختر الخدمات</h3>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد خدمات متاحة</p>
              ) : (
                <div className="space-y-2">
                  {services.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <div className="font-bold text-sm">{svc.name}</div>
                        <div className="text-xs text-teal-600 font-bold">{svc.price} ج.م</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCart((c) => ({ ...c, [svc.id]: Math.max(0, (c[svc.id] ?? 0) - 1) }))}
                          className="w-7 h-7 rounded-full border flex items-center justify-center font-bold text-lg leading-none">−</button>
                        <span className="w-6 text-center font-bold text-sm">{cart[svc.id] ?? 0}</span>
                        <button onClick={() => setCart((c) => ({ ...c, [svc.id]: (c[svc.id] ?? 0) + 1 }))}
                          className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg leading-none">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-sm font-bold block mb-1">ملاحظات (اختياري)</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="أي ملاحظات على الطلب..." />
              </div>

              <div>
                <label className="text-sm font-bold block mb-1">صور القطع (مشاكل، بقع، إلخ)</label>
                <label className="flex items-center gap-2 border-2 border-dashed border-teal-300 rounded-lg p-3 cursor-pointer hover:bg-teal-50 transition">
                  <Camera className="w-5 h-5 text-teal-600" />
                  <span className="text-sm text-teal-700">ارفع صور (حتى 5 صور)</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
                {images.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {images.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                        <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {Object.values(cart).some((v) => v > 0) && (
                <div className="bg-teal-50 rounded-lg p-3 text-sm">
                  <div className="font-bold text-teal-800">الإجمالي: {
                    Object.entries(cart).filter(([, q]) => q > 0)
                      .reduce((s, [id, q]) => s + (services.find((sv) => sv.id === id)?.price ?? 0) * q, 0)
                  } ج.م</div>
                </div>
              )}

              <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={placeOrder} disabled={placing}>
                {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ms-1" />إرسال الطلب</>}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const idx = ORDER_STEPS.findIndex((s) => s.key === order.status);
  const step = ORDER_STEPS[idx] ?? ORDER_STEPS[0];
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold">طلب #{order.order_number}</div>
            <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ar-EG")}</div>
          </div>
          <Badge style={{ background: step.color, color: "#fff" }}>{step.label}</Badge>
        </div>
        {order.status !== "delivered" && order.status !== "cancelled" && (
          <div className="flex gap-1">
            {ORDER_STEPS.slice(0, -1).map((s, i) => (
              <div key={s.key} className={`h-1.5 flex-1 rounded-full transition-all ${i <= idx ? "bg-teal-500" : "bg-slate-200"}`} />
            ))}
          </div>
        )}
        {order.total > 0 && (
          <div className="text-sm font-bold text-teal-700">{order.total} ج.م</div>
        )}
        {order.promised_delivery_at && order.status !== "delivered" && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> موعد التسليم: {new Date(order.promised_delivery_at).toLocaleDateString("ar-EG")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
