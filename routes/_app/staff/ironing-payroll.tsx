import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/_app/staff/ironing-payroll")({
  head: () => ({ meta: [{ title: "رواتب فنيي الكي" }] }),
  component: IroningPayroll,
});

type Row = {
  employee_id: string; full_name: string;
  total_ironing: number; orders_count: number;
  percentage: number; rate_id: string | null;
};

function IroningPayroll() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  async function load() {
    setLoading(true);
    // Get all ironing-station employees
    const { data: emps } = await supabase.from("employees")
      .select("id, full_name").eq("is_active", true).eq("station", "ironing");
    // Get their task assignments for ironing in the date range
    const { data: assigns } = await supabase.from("task_assignments")
      .select("employee_id, order_id, assigned_at, station")
      .eq("station", "ironing")
      .gte("assigned_at", from + "T00:00:00")
      .lte("assigned_at", to + "T23:59:59");
    // Get ironing items for those orders
    const orderIds = Array.from(new Set((assigns ?? []).map((a: any) => a.order_id)));
    let items: any[] = [];
    if (orderIds.length) {
      const { data } = await supabase.from("order_items")
        .select("order_id, qty, unit_price, service_type")
        .in("order_id", orderIds)
        .in("service_type", ["ironing", "both"]);
      items = data ?? [];
    }
    const { data: rates } = await supabase.from("ironing_rates").select("*");

    const result: Row[] = (emps ?? []).map((e: any) => {
      const myAssigns = (assigns ?? []).filter((a: any) => a.employee_id === e.id);
      const myOrderIds = new Set(myAssigns.map((a: any) => a.order_id));
      const myItems = items.filter((it) => myOrderIds.has(it.order_id));
      const total = myItems.reduce((s, it) => s + Number(it.qty) * Number(it.unit_price), 0);
      const rate = (rates ?? []).find((r: any) => r.employee_id === e.id);
      return {
        employee_id: e.id, full_name: e.full_name,
        total_ironing: total, orders_count: myOrderIds.size,
        percentage: rate ? Number(rate.percentage) : 0,
        rate_id: rate?.id ?? null,
      };
    });
    setRows(result);
    setLoading(false);
  }
  useEffect(() => { load(); }, [from, to]);

  async function saveRate(r: Row, pct: number) {
    const payload = { employee_id: r.employee_id, percentage: pct, effective_from: new Date().toISOString().slice(0, 10) };
    const { error } = r.rate_id
      ? await supabase.from("ironing_rates").update({ percentage: pct }).eq("id", r.rate_id)
      : await supabase.from("ironing_rates").insert(payload);
    if (error) toast.error(error.message); else { toast.success("تم الحفظ"); load(); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">رواتب فنيي الكي</h1>
        <p className="text-sm text-muted-foreground">حساب يومي/فترة حسب نسبة التشغيل</p>
      </div>
      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-end">
        <div><Label className="text-xs">من</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label className="text-xs">إلى</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </CardContent></Card>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-start p-3">الفني</th>
                <th className="text-end p-3">عدد الطلبات</th>
                <th className="text-end p-3">إجمالي تكلفة الكي</th>
                <th className="text-end p-3">نسبة التشغيل %</th>
                <th className="text-end p-3">الراتب المستحق</th>
                {canEdit && <th className="p-3 w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={canEdit ? 6 : 5} className="p-8 text-center text-muted-foreground">لا يوجد فنيو كي</td></tr>}
              {rows.map((r) => {
                const salary = r.total_ironing * (r.percentage / 100);
                return (
                  <RateRow key={r.employee_id} r={r} salary={salary} canEdit={canEdit} onSave={saveRate} />
                );
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}

function RateRow({ r, salary, canEdit, onSave }: { r: Row; salary: number; canEdit: boolean; onSave: (r: Row, pct: number) => void }) {
  const [pct, setPct] = useState(String(r.percentage));
  return (
    <tr className="border-t">
      <td className="p-3 font-medium">{r.full_name}</td>
      <td className="p-3 text-end">{r.orders_count}</td>
      <td className="p-3 text-end">{fmtMoney(r.total_ironing)}</td>
      <td className="p-3 text-end">
        {canEdit
          ? <Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} className="w-20 h-8 inline-block" />
          : `${r.percentage}%`}
      </td>
      <td className="p-3 text-end font-bold text-emerald-600">{fmtMoney(salary)}</td>
      {canEdit && (
        <td className="p-3">
          <Button size="sm" variant="outline" onClick={() => onSave(r, Number(pct))}>
            <Save className="w-3 h-3 ms-1" /> حفظ
          </Button>
        </td>
      )}
    </tr>
  );
}
