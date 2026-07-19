import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, TrendingUp, TrendingDown, AlertTriangle, Wallet } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useCurrency } from "@/hooks/use-currency";

type BranchStats = {
  branchId: string;
  branchName: string;
  ordersToday: number;
  ordersMonth: number;
  revenueMonth: number;
  expensesMonth: number;
  cashBalance: number;
  lateOrders: number;
  activeEmployees: number;
  issues: number;
};

export function BranchCompareDashboard() {
  const { tenantId, hasRole } = useAuth();
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchStats[]>([]);
  const [period, setPeriod] = useState<"today" | "month">("month");

  const canView = hasRole("owner");

  useEffect(() => {
    if (!tenantId || !canView) return;
    load();
  }, [tenantId, period]);

  async function load() {
    setLoading(true);
    try {
      // Get all branches
      const { data: branchList } = await supabase
        .from("branches")
        .select("id, name")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("created_at");

      if (!branchList?.length) {
        setBranches([]);
        setLoading(false);
        return;
      }

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const startDate = period === "today" ? startOfDay.toISOString() : startOfMonth.toISOString();

      const stats: BranchStats[] = await Promise.all(
        branchList.map(async (b: { id: string; name: string }) => {
          const [ordersRes, revenueRes, expensesRes, cashRes, lateRes, empRes] = await Promise.all([
            supabase
              .from("orders")
              .select("id, total, status, promised_delivery_at", { count: "exact" })
              .eq("branch_id", b.id)
              .gte("created_at", startDate)
              .neq("status", "cancelled"),
            supabase
              .from("orders")
              .select("total")
              .eq("branch_id", b.id)
              .gte("created_at", startDate)
              .neq("status", "cancelled"),
            supabase
              .from("expenses")
              .select("amount")
              .eq("branch_id", b.id)
              .gte("created_at", startDate)
              .then((r: any) => r)
              .catch(() => ({ data: [] })),
            supabase
              .from("cash_accounts")
              .select("id")
              .eq("branch_id", b.id)
              .eq("is_active", true)
              .then((r: any) => r)
              .catch(() => ({ data: [] })),
            supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("branch_id", b.id)
              .not("status", "in", "(delivered,cancelled)")
              .lt("promised_delivery_at", now.toISOString()),
            supabase
              .from("employees")
              .select("id", { count: "exact", head: true })
              .eq("branch_id", b.id)
              .eq("is_active", true),
          ]);

          const revenue = (revenueRes.data ?? []).reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
          const expenses = (expensesRes.data ?? []).reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);

          return {
            branchId: b.id,
            branchName: b.name,
            ordersToday: ordersRes.count ?? 0,
            ordersMonth: ordersRes.count ?? 0,
            revenueMonth: revenue,
            expensesMonth: expenses,
            cashBalance: 0, // Would need cash_transactions join
            lateOrders: lateRes.count ?? 0,
            activeEmployees: empRes.count ?? 0,
            issues: (lateRes.count ?? 0),
          };
        })
      );

      setBranches(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!canView) return null;

  const totals = branches.reduce(
    (acc, b) => ({
      orders: acc.orders + (period === "today" ? b.ordersToday : b.ordersMonth),
      revenue: acc.revenue + b.revenueMonth,
      expenses: acc.expenses + b.expensesMonth,
      late: acc.late + b.lateOrders,
      employees: acc.employees + b.activeEmployees,
    }),
    { orders: 0, revenue: 0, expenses: 0, late: 0, employees: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Building2 className="w-6 h-6 text-teal-600" /> مقارنة الفروع
          </h2>
          <p className="text-sm text-muted-foreground">نظرة شاملة على أداء كل فرع</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="month">الشهر</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>تحديث</Button>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">إجمالي الطلبات</div><div className="text-xl font-black">{totals.orders}</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">إجمالي الإيراد</div><div className="text-xl font-black text-teal-600">{fmtMoney(totals.revenue, currency)}</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">إجمالي المصروفات</div><div className="text-xl font-black text-red-600">{fmtMoney(totals.expenses, currency)}</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">صافي تقريبي</div><div className={`text-xl font-black ${totals.revenue - totals.expenses >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtMoney(totals.revenue - totals.expenses, currency)}</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">طلبات متأخرة</div><div className={`text-xl font-black ${totals.late > 0 ? "text-red-600" : "text-emerald-600"}`}>{totals.late}</div></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : branches.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">لا توجد فروع نشطة</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => {
            const orders = period === "today" ? b.ordersToday : b.ordersMonth;
            const net = b.revenueMonth - b.expensesMonth;
            return (
              <Card key={b.branchId} className="hover:shadow-md transition">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-teal-600" />
                        {b.branchName}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {b.activeEmployees} موظف نشط
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-center">
                      <div><div className="text-xs text-muted-foreground">طلبات</div><div className="text-lg font-black">{orders}</div></div>
                      <div><div className="text-xs text-muted-foreground">إيراد</div><div className="text-lg font-black text-teal-600">{fmtMoney(b.revenueMonth, currency)}</div></div>
                      <div><div className="text-xs text-muted-foreground">مصروفات</div><div className="text-lg font-black text-red-600">{fmtMoney(b.expensesMonth, currency)}</div></div>
                      <div>
                        <div className="text-xs text-muted-foreground">صافي</div>
                        <div className={`text-lg font-black ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {net >= 0 ? <TrendingUp className="w-4 h-4 inline me-1" /> : <TrendingDown className="w-4 h-4 inline me-1" />}
                          {fmtMoney(net, currency)}
                        </div>
                      </div>
                      {b.lateOrders > 0 && (
                        <div><div className="text-xs text-muted-foreground">متأخرة</div><Badge variant="destructive" className="text-base">{b.lateOrders}</Badge></div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
