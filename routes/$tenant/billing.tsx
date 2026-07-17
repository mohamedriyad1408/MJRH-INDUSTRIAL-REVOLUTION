import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/billing")({
  head: () => ({ meta: [{ title: "اشتراك المنصة" }] }),
  component: BillingPage,
});

function BillingPage() {
  const { t, dir } = useI18n();
  const { hasRole } = useAuth();
  const { currency } = useCurrency();
  const canView = hasRole("owner");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("tenant_billing_invoices").select("*").order("period_start", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { if (canView) load(); }, [canView]);

  if (!canView) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("billing.ownerOnly", "الفواتير متاحة للمالك فقط.")}</CardContent></Card>;

  return <div className="space-y-5" dir={dir}>
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-black flex items-center gap-2"><ReceiptText className="w-7 h-7 text-teal-600" />{t("billing.title", "اشتراك المنصة")}</h1><p className="text-sm text-muted-foreground">{t("billing.subtitle", "فواتير SaaS الخاصة بالمغسلة وحالة السداد.")}</p></div><Button variant="outline" onClick={load}>{t("common.refresh")}</Button></div>
    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {rows.map((r) => <Card key={r.id}><CardHeader><CardTitle className="text-base flex items-center justify-between"><span>{r.period_start} → {r.period_end}</span><Badge variant={r.status === "paid" ? "secondary" : r.status === "overdue" ? "destructive" : "outline"}>{statusAr(r.status, t)}</Badge></CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="text-2xl font-black text-teal-700">{fmtMoney(r.amount, currency)}</div><div className="text-muted-foreground">{t("billing.dueDate", "تاريخ الاستحقاق")}: {r.due_date ?? "—"}</div>{r.paid_at && <div className="text-emerald-700">{t("billing.paidAt", "مدفوعة في")}: {new Date(r.paid_at).toLocaleDateString("ar-EG")}</div>}{r.notes && <div className="rounded-xl bg-muted p-2">{r.notes}</div>}</CardContent></Card>)}
      {!rows.length && <Card className="col-span-full"><CardContent className="p-10 text-center text-muted-foreground">{t("billing.empty", "لا توجد فواتير اشتراك بعد.")}</CardContent></Card>}
    </div>}
  </div>;
}
function statusAr(s: string, t: any) { return ({ draft: t("billing.status.draft", "مسودة"), issued: t("billing.status.issued", "صادرة"), paid: t("billing.status.paid", "مدفوعة"), overdue: t("billing.status.overdue", "متأخرة"), void: t("billing.status.void", "ملغية") } as any)[s] ?? s; }
