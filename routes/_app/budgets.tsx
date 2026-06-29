import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, Plus, Loader2, TrendingUp, TrendingDown, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/budgets")({
  head: () => ({ meta: [{ title: "الميزانيات - MJRH" }] }),
  component: BudgetsPage,
});

type B = { id: string; period_type: string; period_label: string; expected_revenue: number; expected_expenses: number; actual_revenue: number; actual_expenses: number; expense_details: Record<string, number> };

function BudgetsPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const isOwner = hasRole("owner");
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<B[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [label, setLabel] = useState("");
  const [periodType, setPeriodType] = useState("monthly");
  const [revenue, setRevenue] = useState("");
  const [cats, setCats] = useState<Record<string, string>>({ salaries: "", rent: "", electricity: "", water: "", supplies: "", maintenance: "", marketing: "", other: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("v_operating_budgets").select("*").eq("tenant_id", tenantId).order("period_label", { ascending: false });
    if (error) toast.error(error.message);
    setBudgets(data ?? []);
    if (data?.length && !selectedId) setSelectedId(data[0].id);
    setLoading(false);
  }

  useEffect(() => { if (isOwner) load(); }, [isOwner, tenantId]);

  async function save() {
    if (!label || !revenue) { toast.error(t("budgets.errData", "أدخل الاسم والإيراد المستهدف")); return; }
    setSaving(true);
    let totalExp = 0;
    const details: Record<string, number> = {};
    Object.entries(cats).forEach(([k, v]) => { const n = Number(v || 0); details[k] = n; totalExp += n; });

    const { error } = await supabase.from("operating_budgets").insert({
      tenant_id: tenantId, period_type: periodType, period_label: label, expected_revenue: Number(revenue), expected_expenses: totalExp, expense_details: details,
    });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success(t("budgets.toastSaved", "تم حفظ الهدف")); setOpen(false); load(); }
  }

  if (!isOwner) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("budgets.ownerOnly", "للمالك فقط")}</CardContent></Card>;

  const selected = budgets.find((b) => b.id === selectedId) || budgets[0];
  const curr = t("common.egp");

  const CATS = [
    { value: "salaries", label: t("budgets.cat.salaries", "الرواتب") },
    { value: "rent", label: t("budgets.cat.rent", "الإيجار") },
    { value: "electricity", label: t("budgets.cat.electricity", "الكهرباء") },
    { value: "water", label: t("budgets.cat.water", "المياه") },
    { value: "supplies", label: t("budgets.cat.supplies", "الخامات والمستلزمات") },
    { value: "maintenance", label: t("budgets.cat.maintenance", "الصيانة") },
    { value: "marketing", label: t("budgets.cat.marketing", "التسويق") },
    { value: "other", label: t("budgets.cat.other", "أخرى") },
  ];

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="w-6 h-6 text-teal-600" />{t("budgets.title", "الهدف الشهري")}</h1>
          <p className="text-sm text-muted-foreground">{t("budgets.subtitle", "اكتب المتوقع تكسب كام وتصرف كام، والسيستم يقارن بالفعلي تلقائيًا.")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" /> {t("budgets.title", "الهدف الشهري")}</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("budgets.title", "الهدف الشهري")}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><Label>{t("budgets.title", "الاسم")}</Label><Input placeholder="2026-06" value={label} onChange={(e) => setLabel(e.target.value)} /></div>
              <div><Label>{t("budgets.periodsHeader", "الفترة")}</Label><Select value={periodType} onValueChange={setPeriodType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">{t("budgets.periodMonthly", "شهري")}</SelectItem><SelectItem value="weekly">{t("budgets.periodWeekly", "أسبوعي")}</SelectItem></SelectContent></Select></div>
              <div><Label>{t("budgets.revLabel", "الإيرادات المستهدفة")}</Label><Input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} /></div>
              <div className="text-xs font-bold pt-2">{t("budgets.expLabel", "المصروفات المخططة")}</div>
              {CATS.map((c) => <div key={c.value} className="grid grid-cols-2 gap-2 items-center"><Label className="text-xs">{c.label}</Label><Input type="number" placeholder="0" value={cats[c.value]} onChange={(e) => setCats({ ...cats, [c.value]: e.target.value })} /></div>)}
            </div>
            <DialogFooter><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ms-1" /> {t("common.save", "حفظ")}</>}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : !budgets.length ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground"><p className="font-bold text-lg">{t("budgets.emptyTitle", "لا يوجد هدف شهري بعد")}</p><p className="text-sm text-muted-foreground mt-1">{t("budgets.emptySubtitle", "اضغط هدف شهري جديد واكتب المتوقع ببساطة")}</p></CardContent></Card>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-5">
          <Card className="h-fit">
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("budgets.periodsHeader", "الفترات")}</p>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {budgets.map((b) => (
                <button key={b.id} onClick={() => setSelectedId(b.id)} className={`w-full text-start p-3 rounded-xl border transition-colors ${selected.id === b.id ? "bg-teal-50 border-teal-200 font-bold text-teal-950" : "bg-card hover:bg-muted/40"}`}>
                  <div className="flex justify-between items-center"><span>{b.period_label}</span><span className="text-xs text-muted-foreground">{b.period_type === "monthly" ? t("budgets.periodMonthly", "شهري") : t("budgets.periodWeekly", "أسبوعي")}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{Math.round((b.actual_revenue / (b.expected_revenue || 1)) * 100)}% {t("budgets.targetRevPercent", "من الإيراد المستهدف")}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground font-bold">
                    <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> {t("budgets.revLabel", "الإيرادات")}</span>
                    <span>{Math.round((selected.actual_revenue / (selected.expected_revenue || 1)) * 100)}%</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">{fmtMoney(selected.actual_revenue, curr)}</div>
                  <div className="text-xs text-muted-foreground">{t("budgets.targetRev", "مستهدف:")} {fmtMoney(selected.expected_revenue, curr)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground font-bold">
                    <span className="flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5 text-amber-600" /> {t("budgets.expLabel", "المصروفات")}</span>
                    <span>{Math.round((selected.actual_expenses / (selected.expected_expenses || 1)) * 100)}%</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-700">{fmtMoney(selected.actual_expenses, curr)}</div>
                  <div className="text-xs text-muted-foreground">{t("budgets.targetExp", "مخطط:")} {fmtMoney(selected.expected_expenses, curr)}</div>
                </CardContent>
              </Card>

              <Card className={selected.actual_revenue - selected.actual_expenses < 0 ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/50"}>
                <CardContent className="p-4">
                  <div className="text-xs font-bold text-muted-foreground mb-1">{t("budgets.actualProfit", "صافي الربح الفعلي")}</div>
                  <div className={`text-2xl font-bold ${selected.actual_revenue - selected.actual_expenses < 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {fmtMoney(selected.actual_revenue - selected.actual_expenses, curr)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{t("budgets.targetProfit", "صافي مخطط")}: {fmtMoney(selected.expected_revenue - selected.expected_expenses, curr)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">{t("budgets.detailTitle", "تفصيل بنود الميزانية")}</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="text-start p-3">{t("budgets.colItem", "البند")}</th>
                      <th className="text-end p-3">{t("budgets.colPlan", "المخطط")}</th>
                      <th className="text-end p-3">{t("budgets.colActual", "الفعلي")}</th>
                      <th className="text-end p-3">{t("budgets.colDiff", "الفرق")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATS.map((c) => {
                      const exp = Number((selected.expense_details as any)?.[c.value] ?? 0);
                      const act = Number((selected as any)[`actual_${c.value}`] ?? 0);
                      const diff = exp - act;
                      return (
                        <tr key={c.value} className="border-t">
                          <td className="p-3 font-bold">{c.label}</td>
                          <td className="p-3 text-end">{fmtMoney(exp, curr)}</td>
                          <td className="p-3 text-end">{fmtMoney(act, curr)}</td>
                          <td className={`p-3 text-end font-bold ${diff < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmtMoney(diff, curr)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
