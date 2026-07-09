import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Banknote, CheckCircle2, Save } from "lucide-react";
import { useI18n, interpolate } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/staff/ironing-payroll")({
  head: () => ({ meta: [{ title: "رواتب فنيي الكي" }] }),
  component: IroningPayrollPage,
});

function IroningPayrollPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const canEdit = hasRole("owner", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [from, setFrom] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [cashAccountId, setCashAccountId] = useState("");
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const [cRes, pRes, rRes] = await Promise.all([
      supabase.from("cash_accounts").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
      supabase.from("daily_ironing_payouts").select("*,employees(full_name)").eq("tenant_id", tenantId).gte("payout_date", from).lte("payout_date", to).order("payout_date", { ascending: false }),
      supabase.from("v_ironing_technician_performance").select("*").eq("tenant_id", tenantId),
    ]);
    if (cRes.error) toast.error(cRes.error.message);
    setCashAccounts(cRes.data ?? []);
    setPayouts(pRes.data ?? []);
    setRows(rRes.data ?? []);
    if (cRes.data?.length && !cashAccountId) setCashAccountId(cRes.data[0].id);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tenantId, from, to]);

  async function payToday() {
    if (!cashAccountId) return toast.error(t("ironingPayroll.errCash", "اختار الخزنة التي سيتم الصرف منها"));
    setPaying(true);
    const { data, error } = await supabase.rpc("submit_daily_ironing_payout", {
      _tenant_id: tenantId, _payout_date: to, _cash_account_id: cashAccountId,
    });
    setPaying(false);
    if (error) toast.error(error.message); else {
      toast.success(interpolate(t("ironingPayroll.toastPaid", "تم صرف {amount} لعدد {count} فني"), { amount: fmtMoney(data?.total_amount ?? 0, t("common.egp")), count: data?.workers_count ?? 0 }));
      load();
    }
  }

  async function savePercentage(id: string, percentage: number) {
    const { error } = await supabase.from("employees").update({ commission_percent: percentage }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("ironingPayroll.toastSaved", "تم الحفظ")); load(); }
  }

  const curr = t("common.egp");

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{t("ironingPayroll.title", "رواتب فنيي الكي")}</h1>
        <p className="text-sm text-muted-foreground">{t("ironingPayroll.subtitle", "حساب فترة حسب القطع المسندة لكل فني كي بعد التوزيع العادل")}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3 bg-card p-3 rounded-2xl border shadow-sm">
        <div><Label className="text-xs">{t("ironingPayroll.from", "من")}</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label className="text-xs">{t("ironingPayroll.to", "إلى")}</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="min-w-[160px] sm:min-w-56 flex-1"><Label className="text-xs">{t("ironingPayroll.cashLabel", "الخزنة")}</Label><select className="h-11 md:h-10 w-full rounded-md border bg-background px-3 text-sm" value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value)}>{cashAccounts.map((c) => <option key={c.id} value={c.id}>{c.name} — {fmtMoney(c.current_balance, curr)}</option>)}</select></div>
        {canEdit && <Button onClick={payToday} disabled={paying} className="bg-emerald-600 hover:bg-emerald-700">{paying ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Banknote className="w-4 h-4 ms-1" />} {t("ironingPayroll.payTodayBtn", "صرف يومية تاريخ")} {to}</Button>}
      </div>
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="grid lg:grid-cols-[1fr_400px] gap-4">
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-start p-3">{t("ironingPayroll.colStaff", "الفني")}</th>
                <th className="text-end p-3">{t("ironingPayroll.colOrders", "عدد الطلبات")}</th>
                <th className="text-end p-3">{t("ironingPayroll.colValue", "إجمالي قيمة القطع المسندة")}</th>
                <th className="text-end p-3">{t("ironingPayroll.colPercent", "نسبة التشغيل %")}</th>
                <th className="text-end p-3">{t("ironingPayroll.colNet", "الراتب المستحق")}</th>
                {canEdit && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={canEdit ? 6 : 5} className="p-8 text-center text-muted-foreground">{t("ironingPayroll.empty", "لا يوجد فنيو كي")}</td></tr>}
              {rows.map((r) => <TrRow key={r.employee_id} r={r} canEdit={canEdit} onSave={savePercentage} curr={curr} t={t} />)}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />{t("ironingPayroll.payoutsTitle", "سجل صرف اليوميات")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {payouts.map((p) => <div key={p.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><div><b>{p.employees?.full_name}</b><div className="text-xs text-muted-foreground">{p.payout_date} · {interpolate(t("ironingPayroll.payoutDetail", "{pieces} قطعة · نسبة {percent}%"), { pieces: p.pieces_count, percent: p.percentage })}</div></div><div className="font-black text-emerald-700">{fmtMoney(p.amount, curr)}</div></div>)}
          {!payouts.length && <div className="p-6 text-center text-muted-foreground">{t("ironingPayroll.payoutsEmpty", "لا توجد يوميات مصروفة في الفترة المختارة")}</div>}
        </CardContent>
      </Card>
    </div>}
  </div>;
}

function TrRow({ r, canEdit, onSave, curr, t }: { r: any; canEdit: boolean; onSave: (id: string, p: number) => void; curr: string; t: any }) {
  const [val, setVal] = useState(String(r.commission_percent ?? 50));
  return <tr className="border-t">
    <td className="p-3 font-bold">{r.full_name}</td>
    <td className="p-3 text-end">{r.orders_count}</td>
    <td className="p-3 text-end font-bold">{fmtMoney(r.total_assigned_value, curr)}</td>
    <td className="p-3 text-end">
      {canEdit ? <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="w-20 ms-auto text-end h-9" /> : `${r.commission_percent}%`}
    </td>
    <td className="p-3 text-end font-black text-emerald-700">{fmtMoney((Number(r.total_assigned_value) * Number(val)) / 100, curr)}</td>
    {canEdit && <td className="p-3 text-end">
      <Button size="sm" variant="outline" onClick={() => onSave(r.employee_id, Number(val))}>
        <Save className="w-3 h-3 ms-1" /> {t("ironingPayroll.save", "حفظ")}
      </Button>
    </td>}
  </tr>;
}
