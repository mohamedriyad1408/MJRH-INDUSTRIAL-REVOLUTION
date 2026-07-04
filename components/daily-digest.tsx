import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Sun, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { tone, getToneDictionary } from "@/lib/tone-dictionary";

interface DigestData {
  todayOrders: number;
  readyUnits: number;
  lateCount: number;
  netToday: number;
}

export function DailyDigest() {
  const { user } = useAuth();
  const [data, setData] = useState<DigestData | null>(null);
  const dict = getToneDictionary();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 17 ? "مساء الخير" : "مساء النور";

  useEffect(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    Promise.all([
      supabase.from("orders").select("total,status,promised_delivery_at").gte("created_at", todayIso),
    ]).then(([{ data: orders }]) => {
      const os = orders ?? [];
      setData({
        todayOrders: os.filter((o: any) => o.status !== "cancelled").length,
        readyUnits: os.filter((o: any) => o.status === "ready").length,
        lateCount: os.filter((o: any) => o.promised_delivery_at && o.promised_delivery_at < new Date().toISOString() && !["delivered","cancelled"].includes(o.status)).length,
        netToday: os.filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + Number(o.total ?? 0), 0),
      });
    });
  }, []);

  if (!data) return null;

  return (
    <Card className="bg-gradient-to-br from-teal-600 to-teal-800 border-0 text-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-4 h-4 text-teal-200" />
          <span className="text-sm font-bold text-teal-100">{greeting} 👋</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/10 rounded-lg p-2">
            <div className="text-lg font-black">{data.todayOrders}</div>
            <div className="text-xs text-teal-200">طلبات اليوم</div>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <div className="text-lg font-black text-emerald-300">{data.netToday.toLocaleString()} ج</div>
            <div className="text-xs text-teal-200">{tone(dict, "daily_net", { amount: "" }).replace("{amount} ج", "صافي اليوم")}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <div className="text-lg font-black flex items-center gap-1">
              <Package className="w-4 h-4" />{data.readyUnits}
            </div>
            <div className="text-xs text-teal-200">جاهزة للتسليم</div>
          </div>
          {data.lateCount > 0 && (
            <div className="bg-red-500/30 rounded-lg p-2">
              <div className="text-lg font-black flex items-center gap-1 text-red-200">
                <AlertTriangle className="w-4 h-4" />{data.lateCount}
              </div>
              <div className="text-xs text-red-300">عملاء ينتظرون</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
