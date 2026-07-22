import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getOrdersByStatus, updateOrderStatus } from "@/lib/orders-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/delivery")({
  component: DeliveryPage,
});

function DeliveryPage() {
  const { tenantId, user } = useAuth();
  const { t } = useI18n();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);

  const loadReadyOrders = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await getOrdersByStatus(tenantId, 'READY');
      setOrders(data);
    } catch (err) {
      toast.error(t("delivery.errorFetch", "فشل جلب الطلبات الجاهزة"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadyOrders();
  }, [tenantId]);

  const handleDeliver = async (orderId: string) => {
    if (!user || !tenantId) return;
    setDeliveringId(orderId);
    try {
        const result = await updateOrderStatus(orderId, tenantId, 'DELIVERED', user.id);
        if (result.success) {
          toast.success(t("delivery.successDeliver", "تم تسليم الطلب بنجاح"));
          loadReadyOrders();
        }
    } catch (err: any) {
        toast.error(`فشل التسليم: ${err.message}`);
    } finally {
        setDeliveringId(null);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Truck className="w-6 h-6 text-teal-600" /> {t("delivery.title", "التوصيل")}
        </h1>
        <p className="text-muted-foreground text-sm font-medium">{t("delivery.subtitle", "الطلبات الجاهزة للتسليم للعملاء")}</p>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-bold">{t("delivery.empty", "لا توجد طلبات جاهزة للتوصيل")}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition">
              <CardContent className="p-5 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="font-black text-lg">{t("orders.orderNoShort", "طلب #")}{order.order_number}</div>
                  <div className="text-sm font-bold text-slate-700">
                    {order.customers?.full_name} — {order.customers?.phone}
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(order.created_at)}</div>
                </div>
                <div className="text-right space-y-2">
                  <div className="font-black text-xl text-teal-700">{order.total} {t("common.egp")}</div>
                  <Button
                    onClick={() => handleDeliver(order.id)}
                    disabled={deliveringId === order.id}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                  >
                    {deliveringId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ms-1.5" />}
                    {t("delivery.deliverBtn", "✅ تسليم")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
