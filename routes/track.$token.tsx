import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import { Loader2, CheckCircle2, Clock, Truck, Package, Sparkles, Shirt, Inbox, CreditCard } from "lucide-react";

export const Route = createFileRoute("/track/$token")({
  head: () => ({ meta: [{ title: "متابعة طلبك" }] }),
  component: TrackPage,
});

const STEPS = [
  { key: "pickup_waiting", label: "في انتظار المندوب", icon: Clock, color: "bg-amber-500" },
  { key: "pickup_assigned", label: "المندوب في الطريق", icon: Truck, color: "bg-blue-500" },
  { key: "received", label: "دخل الاستقبال", icon: Inbox, color: "bg-teal-500" },
  { key: "cleaning", label: "تنظيف", icon: Sparkles, color: "bg-blue-500" },
  { key: "ironing", label: "كي", icon: Shirt, color: "bg-purple-500" },
  { key: "packing", label: "تغليف", icon: Package, color: "bg-amber-500" },
  { key: "ready", label: "جاهز للتسليم", icon: CheckCircle2, color: "bg-green-500" },
  { key: "out_for_delivery", label: "خرج للتسليم", icon: Truck, color: "bg-orange-500" },
  { key: "delivered", label: "تم التسليم", icon: CheckCircle2, color: "bg-emerald-600" },
];

function publicStage(order: any) {
  if (order?.status === "cancelled") return "cancelled";
  if (order?.pickup_status === "pending") return "pickup_waiting";
  if (order?.pickup_status === "assigned") return "pickup_assigned";
  return order?.status ?? "received";
}

function TrackPage() {
  const { token } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: ord }, { data: its }] = await Promise.all([
      (supabase as any).rpc("get_order_by_token", { _token: token }).maybeSingle(),
      (supabase as any).rpc("get_order_items_by_token", { _token: token }),
    ]);
    setOrder(ord);
    setItems(its ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  const stage = publicStage(order);
  const currentIdx = STEPS.findIndex((s) => s.key === stage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="text-3xl mb-2">👕</div>
          <h1 className="text-2xl font-bold text-slate-800">متابعة طلبك</h1>
          <p className="text-sm text-slate-500">Dry Tech — نظام إدارة المغاسل</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
            ) : !order ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-bold">الطلب غير موجود</p>
                <p className="text-sm text-muted-foreground mt-1">تأكد من رابط المتابعة</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-teal-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-teal-700 font-bold uppercase tracking-wider">رقم الطلب</div>
                      <div className="text-3xl font-black text-teal-800">#{order.order_number}</div>
                    </div>
                    {order.is_urgent && <Badge className="bg-amber-500">مستعجل</Badge>}
                  </div>
                  <div className="text-sm text-teal-700 mt-1">{order.customer_name}</div>
                  <div className="mt-2 text-sm font-black text-teal-900">الإجمالي: {fmtMoney(order.total)}</div>
                </div>

                <CustomerHint order={order} />

                {order.status !== "cancelled" ? (
                  <div className="space-y-1">
                    {STEPS.map((step, i) => {
                      const done = i < currentIdx;
                      const active = i === currentIdx;
                      const Icon = step.icon;
                      return <div key={step.key} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${active ? "bg-teal-50 border border-teal-200" : done ? "opacity-70" : "opacity-30"}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${active ? step.color + " text-white shadow-md" : done ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"}`}>
                          {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <Icon className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div className="flex-1"><div className={`text-sm font-bold ${active ? "text-teal-800" : done ? "text-green-700" : "text-slate-400"}`}>{step.label}</div></div>
                        {active && <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />}
                      </div>;
                    })}
                  </div>
                ) : <div className="text-center py-4"><div className="text-3xl mb-2">❌</div><p className="font-bold text-red-600">تم إلغاء الطلب</p></div>}

                {items.length > 0 && <div className="rounded-xl border bg-white p-3 space-y-1">
                  <div className="font-black text-sm mb-2">بنود الطلب</div>
                  {items.map((it, i) => <div key={i} className="flex justify-between text-xs"><span>{it.qty} × {it.name}</span><span>{fmtMoney(it.line_total)}</span></div>)}
                </div>}

                <div className="rounded-xl border bg-white p-3 text-xs space-y-1">
                  <div className="font-black flex items-center gap-1"><CreditCard className="w-3 h-3" /> الدفع</div>
                  <div>{order.payment_status === "paid" ? "تم تسجيل الدفع" : order.invoice_finalized_at ? "الفاتورة جاهزة للدفع" : "الفاتورة قيد المراجعة النهائية"}</div>
                  {Number(order.overpayment_amount ?? 0) > 0 && <div className="text-emerald-700 font-bold">تم تسجيل زيادة {fmtMoney(order.overpayment_amount)}</div>}
                </div>

                {order.promised_delivery_at && order.status !== "delivered" && <div className="border-t pt-3 text-center"><div className="text-xs text-muted-foreground">الموعد المتوقع للتسليم</div><div className="font-bold text-sm mt-1">{new Date(order.promised_delivery_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</div></div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CustomerHint({ order }: { order: any }) {
  if (order.pickup_status === "pending") return <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">طلبك اتسجل، وفي انتظار تعيين مندوب للاستلام من عنوانك.</div>;
  if (order.pickup_status === "assigned") return <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">تم تعيين مندوب، وهو في طريقه لاستلام الطلب.</div>;
  if (order.pickup_status === "converted" && order.status === "received") return <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 text-xs text-teal-700">تم استلام الطلب من المندوب ودخل الاستقبال.</div>;
  if (["cleaning", "ironing", "packing"].includes(order.status)) return <div className="rounded-xl bg-slate-50 border p-3 text-xs text-slate-600">طلبك داخل التشغيل الآن. سيتم اعتماد الفاتورة بعد المراجعة النهائية.</div>;
  if (order.status === "ready") return <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700">طلبك جاهز للتسليم. تابع الدفع أو انتظر المندوب.</div>;
  if (order.status === "out_for_delivery") return <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-xs text-orange-700">طلبك خرج للتسليم مع المندوب.</div>;
  if (order.status === "delivered") return <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700">تم تسليم طلبك. شكرًا لثقتك بنا.</div>;
  return null;
}
