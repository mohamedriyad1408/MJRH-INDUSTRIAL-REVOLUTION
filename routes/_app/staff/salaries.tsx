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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Wallet, Check } from "lucide-react";

export const Route = createFileRoute("/_app/staff/salaries")({
  head: () => ({ meta: [{ title: "الرواتب اليومية" }] }),
  component: SalariesPage,
});

type Row = { id: string; employee_id: string; work_date: string; amount: number; paid: boolean; notes: string | null; employees?: { full_name: string } | null };

function SalariesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner");
  const [list, setList] = useState<Row[]>([]);
  const [emps, setEmps] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", work_date: new Date().toISOString().slice(0, 10), amount: "", notes: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("daily_salaries")
      .select("*, employees(full_name)").order("work_date", { ascending: false }).limit(200);
    setList((data ?? []) as any);
    const { data: e } = await supabase.from("employees").select("id, full_name").eq("is_active", true).order("full_name");
    setEmps((e ?? []) as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.employee_id || !form.amount) return toast.error("اختر الموظف وأدخل المبلغ");
    const { error } = await supabase.from("daily_salaries").insert({
      employee_id: form.employee_id, work_date: form.work_date, amount: Number(form.amount), notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("تم"); setOpen(false); setForm({ employee_id: "", work_date: new Date().toISOString().slice(0, 10), amount: "", notes: "" }); load();
  }
  async function togglePaid(r: Row) {
    const { error } = await supabase.from("daily_salaries").update({ paid: !r.paid }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  const total = list.reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = list.filter((r) => r.paid).reduce((s, r) => s + Number(r.amount), 0);

  if (!canEdit) return <Card className="p-8 text-center">صلاحية مالك المغسلة فقط.</Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6" /> الرواتب اليومية</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 ms-1" /> راتب جديد</Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="text-xl font-bold">{fmtMoney(total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">المدفوع</div><div className="text-xl font-bold text-emerald-600">{fmtMoney(totalPaid)}</div></CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-start p-3">التاريخ</th><th className="text-start p-3">الموظف</th>
                <th className="text-end p-3">المبلغ</th><th className="p-3">الحالة</th><th className="p-3"></th>
              </tr></thead>
              <tbody>
                {!list.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد سجلات</td></tr>}
                {list.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 text-xs">{fmtDate(r.work_date)}</td>
                    <td className="p-3 font-medium">{r.employees?.full_name ?? "—"}</td>
                    <td className="p-3 text-end font-semibold">{fmtMoney(r.amount)}</td>
                    <td className="p-3">{r.paid ? <Badge className="bg-emerald-600">مدفوع</Badge> : <Badge variant="outline">معلق</Badge>}</td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={() => togglePaid(r)}><Check className="w-4 h-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>راتب يومي جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الموظف</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>التاريخ</Label><Input type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} /></div>
            <div><Label>المبلغ</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={add}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
