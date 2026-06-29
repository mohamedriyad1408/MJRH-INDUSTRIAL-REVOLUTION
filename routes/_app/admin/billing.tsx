import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, ReceiptText } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/admin/billing")({
  head: () => ({ meta: [{ title: "فواتير المنصة" }] }),
  component: AdminBillingPage,
});

function AdminBillingPage() {
  const { t, dir } = useI18n();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ tenant_id: "", period_start: new Date().toISOString().slice(0, 10), period_end: new Date().toISOString().slice(0, 10), amount: "0", due_date: "", notes: "" });

  async function load() {
    setLoading(true);
    const [t, r] = await Promise.all([
      (supabase as any).from("tenants").select("id,name,subscription_fee").order("name"),
      (supabase as any).from("tenant_billing_invoices").select("*,tenants(name)").order("created_at", { ascending: false }).limit(100),
    ]);
    if (t.error) toast.error(t.error.message);
    setTenants(t.data ?? []); setRows(r.data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function chooseTenant(id: string) {
    const t = tenants.find((x) => x.id === id);
    setForm({ ...form, tenant_id: id, amount: String(t?.subscription_fee ?? form.amount) });
  }
  async function createInvoice() {
    if (!form.tenant_id) return toast.error("اختار مغسلة");
    const { error } = await (supabase as any).from("tenant_billing_invoices").insert({
      tenant_id: form.tenant_id, period_start: form.period_start, period_end: form.period_end, amount: Number(form.amount || 0), due_date: form.due_date || null, notes: form.notes || null, status: "issued",
    });
    if (error) toast.error(error.message); else { toast.success("تم إصدار الفاتورة"); setForm({ tenant_id: "", period_start: new Date().toISOString().slice(0, 10), period_end: new Date().toISOString().slice(0, 10), amount: "0", due_date: "", notes: "" }); load(); }
  }
  async function setStatus(id: string, status: string) {
    const patch: any = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await (supabase as any).from("tenant_billing_invoices").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم تحديث الفاتورة"); load(); }
  }

  return <div className="space-y-5" dir={dir}>
    <div><h1 className="text-2xl font-black flex items-center gap-2"><ReceiptText className="w-7 h-7 text-teal-600" />فواتير المنصة SaaS</h1><p className="text-sm text-muted-foreground">إصدار فواتير اشتراك للمغاسل ومتابعة السداد.</p></div>
    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="grid lg:grid-cols-[380px_1fr] gap-4">
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" />إصدار فاتورة</CardTitle></CardHeader><CardContent className="space-y-3">
        <Field label="المغسلة"><Select value={form.tenant_id} onValueChange={chooseTenant}><SelectTrigger><SelectValue placeholder="اختار مغسلة" /></SelectTrigger><SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field>
        <div className="grid grid-cols-2 gap-2"><Field label="من"><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></Field><Field label="إلى"><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></Field></div>
        <div className="grid grid-cols-2 gap-2"><Field label="القيمة"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field><Field label="استحقاق"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field></div>
        <Textarea placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button onClick={createInvoice} className="w-full">إصدار</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">آخر الفواتير</CardTitle></CardHeader><CardContent className="space-y-2">
        {rows.map((r) => <div key={r.id} className="rounded-2xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">{r.tenants?.name ?? "مغسلة"}</div><Badge variant={r.status === "paid" ? "secondary" : r.status === "overdue" ? "destructive" : "outline"}>{statusAr(r.status, t)}</Badge></div><div className="text-sm text-muted-foreground mt-1">{r.period_start} → {r.period_end} · {fmtMoney(r.amount)}</div><div className="flex flex-wrap gap-2 mt-3"><Button size="sm" variant="outline" onClick={() => setStatus(r.id, "paid")}>مدفوعة</Button><Button size="sm" variant="outline" onClick={() => setStatus(r.id, "overdue")}>متأخرة</Button><Button size="sm" variant="outline" onClick={() => setStatus(r.id, "void")}>إلغاء</Button></div></div>)}
        {!rows.length && <div className="text-center text-muted-foreground p-10">لا توجد فواتير بعد</div>}
      </CardContent></Card>
    </div>}
  </div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }
function statusAr(s: string, t: any) { return ({ draft: t("billing.status.draft", "مسودة"), issued: t("billing.status.issued", "صادرة"), paid: t("billing.status.paid", "مدفوعة"), overdue: t("billing.status.overdue", "متأخرة"), void: t("billing.status.void", "ملغية") } as any)[s] ?? s; }
