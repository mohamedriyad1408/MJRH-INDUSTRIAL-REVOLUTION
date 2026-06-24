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
import { Loader2, Save, Banknote, CheckCircle2 } from "lucide-react";

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
  const [paying, setPaying] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [cashAccountId, setCashAccountId] = useState("");
  const [payouts, setPayouts] = useState<any[]>([]);
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
    // Low-cost piece-level ironing payroll: count/value comes from numbered pieces assigned to each ironing tech.
    const { data: units } = await (supabase as any).from("service_units")
      .select("assigned_ironing_employee_id,order_id,line_value,unit_price,ironing_completed_at")
      .not("assigned_ironing_employee_id", "is", null)
      .gte("ironing_completed_at", from + "T00:00:00")
      .lte("ironing_completed_at", to + "T23:59:59");
    const [{ data: rates }, { data: cash }, { data: paidRows }] = await Promise.all([
      supabase.from("ironing_rates").select("*"),
      (supabase as any).rpc("ensure_default_cash_account").then(async () => (supabase as any).from("cash_accounts").select("id,name,current_balance").eq("is_active", true).order("created_at")),
      (supabase as any).from("ironing_daily_payouts").select("*,employees(full_name)").gte("payout_date", from).lte("payout_date", to).order("payout_date", { ascending: false }),
    ]);
    setCashAccounts(cash ?? []);
    setCashAccountId((x) => x || cash?.[0]?.id || "");
    setPayouts(paidRows ?? []);

    const result: Row[] = (emps ?? []).map((e: any) => {
      const myUnits = ((units ?? []) as any[]).filter((u) => u.assigned_ironing_employee_id === e.id);
      const myOrderIds = new Set(myUnits.map((u) => u.order_id));
      const total = myUnits.reduce((s, u) => s + Number(u.line_value ?? u.unit_price ?? 0), 0);
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

  async function payToday() {
    if (!cashAccountId) return toast.error("اختار الخزنة التي سيتم الصرف منها");
    setPaying(true);
    const { data, error } = await (supabase as any).rpc("pay_daily_ironing_workers", { _work_date: to, _cash_account_id: cashAccountId });
    setPaying(false);
    if (error) return toast.error(error.message);
    toast.success(`تم صرف ${Number(data?.total_amount ?? 0).toLocaleString("en-US")} جنيه لعدد ${data?.workers_count ?? 0} فني`);
    load();
  }

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
        <p className="text-sm text-muted-foreground">حساب فترة حسب القطع المسندة لكل فني كي بعد التوزيع العادل</p>
      </div>
      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-end">
        <div><Label className="text-xs">من</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label className="text-xs">إلى</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="min-w-56"><Label className="text-xs">الخزنة</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value)}>{cashAccounts.map((c) => <option key={c.id} value={c.id}>{c.name} — {fmtMoney(c.current_balance)}</option>)}</select></div>
        {canEdit && <Button onClick={payToday} disabled={paying} className="bg-emerald-600 hover:bg-emerald-700">{paying ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Banknote className="w-4 h-4 ms-1" />} صرف يومية تاريخ {to}</Button>}
      </CardContent></Card>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-start p-3">الفني</th>
                <th className="text-end p-3">عدد الطلبات</th>
                <th className="text-end p-3">إجمالي قيمة القطع المسندة</th>
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

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />سجل صرف اليوميات</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {payouts.map((p) => <div key={p.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><div><b>{p.employees?.full_name}</b><div className="text-xs text-muted-foreground">{p.payout_date} · {p.pieces_count} قطعة · نسبة {p.percentage}%</div></div><div className="font-black text-emerald-700">{fmtMoney(p.amount)}</div></div>)}
          {!payouts.length && <div className="p-6 text-center text-muted-foreground">لا توجد يوميات مصروفة في الفترة المختارة</div>}
        </CardContent>
      </Card>
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
