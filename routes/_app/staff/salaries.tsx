import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, Plus, Loader2, Save, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/staff/salaries")({
  head: () => ({ meta: [{ title: "الرواتب اليومية" }] }),
  component: DailySalariesPage,
});

type S = { id?: string; employee_id: string; work_date: string; amount: number; paid: boolean; notes?: string | null; employees?: { full_name: string } };

function DailySalariesPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const canEdit = hasRole("owner");
  const [list, setList] = useState<S[]>([]);
  const [emps, setEmps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", work_date: new Date().toISOString().slice(0, 10), amount: "", notes: "" });

  async function load() {
    setLoading(true);
    const [s, e] = await Promise.all([
      (supabase as any).from("daily_salaries").select("*,employees(full_name)").order("work_date", { ascending: false }).limit(100),
      (supabase as any).from("employees").select("id, full_name").eq("is_active", true).order("full_name"),
    ]);
    if (s.error) toast.error(s.error.message);
    setList((s.data ?? []) as S[]);
    setEmps(e.data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.employee_id || !form.amount) return toast.error(t("salaries.errForm", "اختر الموظف وأدخل المبلغ"));
    const payload = { tenant_id: tenantId, employee_id: form.employee_id, work_date: form.work_date, amount: Number(form.amount), paid: true, notes: form.notes || null };
    const { error } = await (supabase as any).from("daily_salaries").insert(payload);
    if (error) toast.error(error.message); else { toast.success(t("salaries.toastDone", "تم")); setOpen(false); setForm({ employee_id: "", work_date: new Date().toISOString().slice(0, 10), amount: "", notes: "" }); load(); }
  }

  async function togglePaid(id: string, paid: boolean) {
    const { error } = await (supabase as any).from("daily_salaries").update({ paid }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("salaries.toastDone", "تم")); load(); }
  }

  if (!canEdit) return <Card className="p-8 text-center">{t("salaries.ownerOnly", "صلاحية مالك المغسلة فقط.")}</Card>;

  const total = list.reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const totalPaid = list.filter((x) => x.paid).reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const curr = t("common.egp");

  return (
    <div className="space-y-4 max-w-4xl" dir={dir}>
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6" /> {t("salaries.pageTitle", "الرواتب اليومية")}</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 ms-1" /> {t("salaries.btnNew", "راتب جديد")}</Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("salaries.total", "الإجمالي")}</div><div className="text-xl font-bold">{fmtMoney(total, curr)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("salaries.totalPaid", "المدفوع")}</div><div className="text-xl font-bold text-emerald-600">{fmtMoney(totalPaid, curr)}</div></CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3">{t("salaries.colDate", "التاريخ")}</th><th className="text-start p-3">{t("salaries.colStaff", "الموظف")}</th>
                  <th className="text-end p-3">{t("salaries.colAmount", "المبلغ")}</th><th className="p-3">{t("salaries.colStatus", "الحالة")}</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {!list.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t("salaries.empty", "لا توجد سجلات")}</td></tr>}
                {list.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium text-xs">{fmtDate(r.work_date)}</td>
                    <td className="p-3 font-bold">{r.employees?.full_name ?? "—"}</td>
                    <td className="p-3 text-end font-bold">{fmtMoney(r.amount, curr)}</td>
                    <td className="p-3">{r.paid ? <Badge className="bg-emerald-600">{t("salaries.paid", "مدفوع")}</Badge> : <Badge variant="outline">{t("salaries.pending", "معلق")}</Badge>}</td>
                    <td className="p-3 text-end">
                      <Button size="sm" variant="outline" onClick={() => r.id && togglePaid(r.id, !r.paid)}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("salaries.titleNew", "راتب يومي جديد")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t("salaries.labelStaff", "الموظف")}</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("salaries.selectStaff", "اختر")} /></SelectTrigger>
                <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("salaries.labelDate", "التاريخ")}</Label><Input type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} /></div>
            <div><Label>{t("salaries.labelAmount", "المبلغ")}</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>{t("salaries.labelNotes", "ملاحظات")}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={add}>{t("salaries.btnSave", "حفظ")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
