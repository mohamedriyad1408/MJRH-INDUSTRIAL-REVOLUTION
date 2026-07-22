import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getOnlineQueue, receiveOnlineOrder } from "@/lib/orders-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PackageOpen, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/online-queue" as any)({
  component: OnlineQueuePage,
});

function OnlineQueuePage() {
  const { tenantId, user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadQueue = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await getOnlineQueue(tenantId);
      setOrders(data);
    } catch (err) {
      toast.error("فشل جلب قائمة الانتظار");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [tenantId]);

  const handleReceive = async (orderId: string) => {
    if (!user || !tenantId) return;
    setProcessingId(orderId);
    const result = await receiveOnlineOrder(orderId, tenantId, user.id);
    setProcessingId(null);
    if (result.success) {
      toast.success("تم استلام الطلب بنجاح");
      loadQueue();
    } else {
      toast.error(`فشل الاستلام: ${result.error}`);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-teal-600" /> طلبات أونلاين - قائمة الانتظار
        </h1>
        <p className="text-muted-foreground text-sm font-medium">الطلبات التي تم استلامها من التطبيق وتنتظر الوصول للفرع</p>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-bold">لا توجد طلبات في قائمة الانتظار</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition">
              <CardContent className="p-5 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="font-black text-lg">طلب #{order.order_number}</div>
                  <div className="text-sm font-bold text-slate-700">
                    {order.customers?.full_name} — {order.customers?.phone}
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(order.created_at)}</div>
                </div>
                <div className="text-right space-y-2">
                  <div className="font-black text-xl text-teal-700">{order.total} ج.م</div>
                  <Button
                    onClick={() => handleReceive(order.id)}
                    disabled={processingId === order.id}
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 font-bold"
                  >
                    {processingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageOpen className="w-4 h-4 ms-1.5" />}
                    استلام الطلب
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
