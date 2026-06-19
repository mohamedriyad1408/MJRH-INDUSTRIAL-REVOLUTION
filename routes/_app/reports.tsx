import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Download, TrendingUp, Award, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "التقارير - MJRH" }] }),
  component: ReportsPage,
});

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function ReportsPage() {
  const { hasRole } = useAuth();
  const canView = hasRole("owner", "ops_manager");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function load() {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const [ordRes, expRes, empRes, svcRes] = await Promise.all([
      supabase.from("orders").select("id,status,total,created_at,order_type,task_assignments(employee_id,station)").gte("created_at", from).lte("created_at", to),
      supabase.from("expenses").select("amount,category").gte("spent_at", from).lte("spent_at", to),
      supabase.from("employees").select("id,full_name,job_role").eq("is_active", true),
      supabase.from("order_items").select("name,service_type,qty,line_total").gte("created_at", from).lte("created_at", to),
    ]);

    const orders = ordRes.data ?? [];
    const expenses = expRes.data ?? [];
    const employees = empRes.data ?? [];
    const items = svcRes.data ?? [];

    const totalRevenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;

    // Station performance — count orders per station from task_assignments
    const stationCounts: Record<string, number> = {};
    orders.forEach((o: any) => {
      (o.task_assignments ?? []).forEach((ta: any) => {
        stationCounts[ta.station] = (stationCounts[ta.station] ?? 0) + 1;
      });
    });

    // Employee productivity
    const empProd: Record<string, { name: string; count: number }> = {};
    employees.forEach((e: any) => { empProd[e.id] = { name: e.full_name, count: 0 }; });
    orders.forEach((o: any) => {
      (o.task_assignments ?? []).forEach((ta: any) => {
        if (empProd[ta.employee_id]) empProd[ta.employee_id].count++;
      });
    });
    const topEmployees = Object.values(empProd).sort((a, b) => b.count - a.count).slice(0, 5);

    // Top services
    const svcMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    items.forEach((i: any) => {
      if (!svcMap[i.name]) svcMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
      svcMap[i.name].qty += Number(i.qty ?? 0);
      svcMap[i.name].revenue += Number(i.line_total ?? 0);
    });
    const topServices = Object.values(svcMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    setData({ totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, totalOrders: orders.length, delivered, cancelled, stationCounts, topEmployees, topServices });
    setLoading(false);
  }

  useEffect(() => { if (canView) load(); }, [year, month]);

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["التقرير", "القيمة"],
      ["الإيرادات", data.totalRevenue],
      ["المصروفات", data.totalExpenses],
      ["صافي الربح", data.netProfit],
      ["إجمالي الطلبات", data.totalOrders],
      ["مسلّمة", data.delivered],
      ["ملغية", data.cancelled],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `mjrh-report-${year}-${month+1}.csv`; a.click();
    toast.success("تم تصدير التقرير");
  }

  if (!canView) return <Card><CardContent className="p-10 text-center text-muted-foreground">للمالك ومدير التشغيل فقط</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-teal-600" />التقارير والتحليلات</h1>
          <p className="text-sm text-muted-foreground">أداء المحطات + إنتاجية الموظفين + أكثر الخدمات طلباً</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024,2025,2026].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}><Download className="w-4 h-4 ms-1" />تصدير CSV</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : data ? (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="border-teal-200 bg-teal-50"><CardContent className="p-4">
              <div className="text-xs text-teal-700">الإيرادات</div>
              <div className="text-2xl font-black text-teal-800">{fmtMoney(data.totalRevenue)}</div>
            </CardContent></Card>
            <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4">
              <div className="text-xs text-amber-700">المصروفات</div>
              <div className="text-2xl font-black text-amber-800">{fmtMoney(data.totalExpenses)}</div>
            </CardContent></Card>
            <Card className={data.netProfit >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">صافي الربح</div>
                <div className={`text-2xl font-black ${data.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtMoney(data.netProfit)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <InfoBox label="إجمالي الطلبات" value={data.totalOrders} />
            <InfoBox label="مسلّمة ✅" value={data.delivered} />
            <InfoBox label="ملغية ❌" value={data.cancelled} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Employees */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" />أكثر الموظفين إنتاجية</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.topEmployees.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">لا توجد بيانات</p>}
                {data.topEmployees.map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-amber-700"}`}>{i + 1}</div>
                    <div className="flex-1 text-sm">{e.name}</div>
                    <div className="font-bold text-sm text-teal-600">{e.count} مهمة</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Services */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />أكثر الخدمات طلباً</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.topServices.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">لا توجد بيانات</p>}
                {data.topServices.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-bold">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.qty} قطعة</div>
                    </div>
                    <div className="font-bold text-sm text-teal-600">{fmtMoney(s.revenue)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: number }) {
  return <div className="border rounded-xl p-4 bg-white text-center"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></div>;
}
