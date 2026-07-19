import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, TrendingDown, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tone, getToneDictionary } from "@/lib/tone-dictionary";

type AlertLevel = "red" | "amber" | "blue";
interface Alert { id: string; level: AlertLevel; icon: React.ReactNode; message: string; action?: string; }

const LEVEL_STYLE: Record<AlertLevel, string> = {
  red:   "bg-red-50 border-red-200 text-red-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  blue:  "bg-blue-50 border-blue-200 text-blue-800",
};

export function SmartAlertsFeed({ compact = false }: { compact?: boolean }) {
  const { tenantId } = useAuth() as any;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const dict = getToneDictionary();

  async function load() {
    setLoading(true);
    const now = new Date().toISOString();
    const newAlerts: Alert[] = [];

    // 1. Late orders
    const { data: late } = await supabase
      .from("orders")
      .select("id")
      .not("status", "in", '("delivered","cancelled")')
      .lt("promised_delivery_at", now);
    const lateCount = (late ?? []).length;
    if (lateCount > 0) newAlerts.push({
      id: "late",
      level: "red",
      icon: <Clock className="w-4 h-4" />,
      message: lateCount === 1
        ? tone(dict, "late_orders_one")
        : tone(dict, "late_orders_many", { count: lateCount }),
    });

    // 2. Stuck units (in same stage > 3 hours)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data: stuck } = await supabase
      .from("service_units")
      .select("id, current_stage, orders!inner(order_number,status)")
      .lt("updated_at", threeHoursAgo)
      .not("current_stage", "in", '("delivered","cancelled","ready")')
      .not("orders.status", "in", "(delivered,cancelled)")
      .limit(3);
    (stuck ?? []).forEach((u: any) => newAlerts.push({
      id: `stuck-${u.id}`,
      level: "amber",
      icon: <Clock className="w-4 h-4" />,
      message: tone(dict, "stuck_unit", { order: u.orders?.order_number ?? "?" }),
    }));

    // 3. Lost customers (haven't ordered in 30+ days, were regular)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: lostCount } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .lt("last_order_at", thirtyDaysAgo)
      .gt("total_orders", 3);
    if ((lostCount ?? 0) > 0) newAlerts.push({
      id: "lost",
      level: "blue",
      icon: <Users className="w-4 h-4" />,
      message: tone(dict, "lost_customer", { count: lostCount ?? 0 }),
    });

    setAlerts(newAlerts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (!alerts.length && !loading) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-teal-600" />
          التنبيهات الذكية
          {alerts.length > 0 && <Badge variant="destructive" className="text-xs">{alerts.length}</Badge>}
          <Button variant="ghost" size="icon" className="w-6 h-6 ms-auto" onClick={load}>
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {alerts.slice(0, compact ? 3 : 10).map((a) => (
          <div key={a.id} className={cn("flex items-start gap-2 border rounded-lg p-2.5 text-xs font-medium", LEVEL_STYLE[a.level])}>
            <span className="flex-shrink-0 mt-0.5">{a.icon}</span>
            <span>{a.message}</span>
          </div>
        ))}
        {loading && <p className="text-xs text-muted-foreground text-center py-2">جاري الفحص...</p>}
      </CardContent>
    </Card>
  );
}
