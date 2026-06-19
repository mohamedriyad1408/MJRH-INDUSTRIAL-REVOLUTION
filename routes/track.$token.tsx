import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, Clock, Truck, Package, Sparkles, Shirt, Inbox } from "lucide-react";

export const Route = createFileRoute("/track/$token")({
  head: () => ({ meta: [{ title: "متابعة طلبك" }] }),
  component: TrackPage,
});

const STEPS = [
  { key: "received",          label: "تم الاستلام",      icon: Inbox,         color: "bg-teal-500" },
  { key: "cleaning",          label: "تنظيف",            icon: Sparkles,      color: "bg-blue-500" },
  { key: "ironing",           label: "كي",               icon: Shirt,         color: "bg-purple-500" },
  { key: "packing",           label: "تغليف",            icon: Package,       color: "bg-amber-500" },
  { key: "ready",             label: "جاهز للتسليم",     icon: CheckCircle2,  color: "bg-green-500" },
  { key: "out_for_delivery",  label: "خرج للتسليم",      icon: Truck,         color: "bg-orange-500" },
  { key: "delivered",         label: "تم التسليم ✅",    icon: CheckCircle2,  color: "bg-emerald-600" },
];

function TrackPage() {
  const { token } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("orders")
      .select("order_number, status, is_urgent, created_at, promised_delivery_at, customers(full_name)")
      .eq("public_token", token)
      .maybeSingle()
      .then(({ data }) => { setOrder(data); setLoading(false); });
  }, [token]);

  const currentIdx = STEPS.findIndex((s) => s.key === order?.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
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
                {/* Order info */}
                <div className="bg-teal-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-teal-700 font-bold uppercase tracking-wider">رقم الطلب</div>
                      <div className="text-3xl font-black text-teal-800">#{order.order_number}</div>
                    </div>
                    {order.is_urgent && (
                      <div className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-300">
                        ⚡ مستعجل
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-teal-700 mt-1">
                    {order.customers?.full_name}
                  </div>
                </div>

                {/* Progress steps */}
                {order.status !== "cancelled" ? (
                  <div className="space-y-1">
                    {STEPS.map((step, i) => {
                      const done = i < currentIdx;
                      const active = i === currentIdx;
                      const future = i > currentIdx;
                      const Icon = step.icon;
                      return (
                        <div
                          key={step.key}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                            active ? "bg-teal-50 border border-teal-200" :
                            done ? "opacity-70" : "opacity-30"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            active ? step.color + " text-white shadow-md" :
                            done ? "bg-green-100 text-green-600" :
                            "bg-slate-100 text-slate-400"
                          }`}>
                            {done ? <CheckCircle2 className="w-4 h-4" /> :
                             active ? <Icon className="w-4 h-4" /> :
                             <Clock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-bold ${active ? "text-teal-800" : done ? "text-green-700" : "text-slate-400"}`}>
                              {step.label}
                            </div>
                          </div>
                          {active && (
                            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">❌</div>
                    <p className="font-bold text-red-600">تم إلغاء الطلب</p>
                  </div>
                )}

                {order.promised_delivery_at && order.status !== "delivered" && (
                  <div className="border-t pt-3 text-center">
                    <div className="text-xs text-muted-foreground">الموعد المتوقع للتسليم</div>
                    <div className="font-bold text-sm mt-1">
                      {new Date(order.promised_delivery_at).toLocaleString("ar-EG", {
                        dateStyle: "medium", timeStyle: "short",
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
