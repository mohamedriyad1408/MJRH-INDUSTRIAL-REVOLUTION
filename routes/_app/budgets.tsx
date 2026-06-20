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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/budgets")({
  head: () => ({ meta: [{ title: "الميزانيات - MJRH" }] }),
  component: BudgetsPage,
});

type Budget = {
  id: string; period_label: string; period_type: "monthly" | "weekly";
  year: number; month?: number; week?: number;
  expected_revenue: number; expected_expenses: number;
  actual_revenue?: number; actual_expenses?: number;
  created_at: string;
};

type BudgetItem = { id: string; budget_id: string; category: string; expected: number; actual?: number; notes?: string };

const EXPENSE_CATS = [
  { value: "salaries", label: "الرواتب" },
  { value: "rent", label: "الإيجار" },
  { value: "electricity", label: "الكهرباء" },
  { value: "water", label: "المياه" },
  { value: "supplies", label: "الخامات والمستلزمات" },
  { value: "maintenance", label: "الصيانة" },
  { value: "marketing", label: "التسويق" },
  { value: "other", label: "أخرى" },
];

function BudgetsPage() {
  const { hasRole, tenantId } = useAuth();
  const isOwner = hasRole("owner");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  // Load actual revenue/expenses for selected budget
  async function enrichBudget(b: Budget): Promise<Budget> {
    const [y, m] = [b.year, b.month ?? 1];
    const from = new Date(y, (m ?? 1) - 1, 1).toISOString();
    const to = new Date(y, (m ?? 1), 0, 23, 59, 59).toISOString();

    const [{ data: orders }, { data: exps }] = await Promise.all([
      supabase.from("orders").select("total").neq("status", "cancelled").gte("created_at", from).lte("created_at", to),
      supabase.from("expenses").select("amount").gte("spent_at", from).lte("spent_at", to),
    ]);
    return {
      ...b,
      actual_revenue: (orders ?? []).reduce((s, o: any) => s + Number(o.total), 0),
      actual_expenses: (exps ?? []).reduce((s, e: any) => s + Number(e.amount), 0),
    };
  }

  async function load() {
    setLoading(true);
    const { data } = await  (supabase as any).from("budgets").select("*").order("created_at", { ascending: false });
    const raw = (data ?? []) as Budget[];
    const enriched = await Promise.all(raw.map(enrichBudget));
    setBudgets(enriched);
    if (enriched.length && !selected) setSelected(enriched[0]);
    setLoading(false);
  }

  async function loadItems(budgetId: string) {
    const { data } = await  (supabase as any).from("budget_items").select("*").eq("budget_id", budgetId);
    setItems((data ?? []) as BudgetItem[]);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selected) loadItems(selected.id); }, [selected]);

  const variance = (expected: number, actual: number) => actual - expected;
  const varPct = (expected: number, actual: number) => expected === 0 ? 0 : ((actual - expected) / expected) * 100;

  function VarBadge({ exp, act, invert = false }: { exp: number; act: number; invert?: boolean }) {
    const v = variance(exp, act);
    const good = invert ? v < 0 : v >= 0;
    return (
      <Badge className={`text-xs ${good ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
        {good ? <CheckCircle2 className="w-3 h-3 ms-0.5" /> : <AlertTriangle className="w-3 h-3 ms-0.5" />}
        {v >= 0 ? "+" : ""}{fmtMoney(v)} ({varPct(exp, act).toFixed(1)}%)
      </Badge>
    );
  }

  function ProgressBar({ value, max, color }: { value: number; max: number; color: "green" | "red" }) {
    const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
    const over = pct >= 100;
    return (
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-red-500" : color === "green" ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }

  if (!isOwner) return <Card><CardContent className="p-10 text-center text-muted-foreground">للمالك فقط</CardContent></Card>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="w-6 h-6 text-teal-600" />الميزانيات</h1>
          <p className="text-sm text-muted-foreground">مقارنة المخطط بالفعلي لكل فترة</p>
        </div>
        <NewBudgetDialog open={newOpen} setOpen={setNewOpen} onCreated={load} tenantId={tenantId} />
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : budgets.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <Target className="w-12 h-12 text-teal-300 mx-auto mb-3" />
          <p className="font-bold text-lg">لا توجد ميزانيات بعد</p>
          <p className="text-sm text-muted-foreground mt-1">أنشئ ميزانيتك الأولى لتتبع الأداء المالي</p>
        </CardContent></Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Budget list */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">الفترات</p>
            {budgets.map((b) => (
              <div key={b.id} onClick={() => setSelected(b)}
                className={`border rounded-xl p-3 cursor-pointer transition-all ${selected?.id === b.id ? "border-teal-500 bg-teal-50 shadow-sm" : "bg-white hover:shadow-sm"}`}>
                <div className="font-bold text-sm">{b.period_label}</div>
                <div className="text-xs text-muted-foreground">{b.period_type === "monthly" ? "شهري" : "أسبوعي"}</div>
                {b.actual_revenue !== undefined && (
                  <div className="mt-2">
                    <ProgressBar value={b.actual_revenue} max={b.expected_revenue} color="green" />
                    <div className="text-xs text-muted-foreground mt-1">{Math.round((b.actual_revenue / (b.expected_revenue || 1)) * 100)}% من الإيراد المستهدف</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Budget detail */}
          {selected && (
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-bold text-lg">{selected.period_label}</h2>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-emerald-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> الإيرادات
                    </div>
                    <div className="text-xl font-black text-emerald-700">{fmtMoney(selected.actual_revenue ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">مستهدف: {fmtMoney(selected.expected_revenue)}</div>
                    <div className="mt-2"><ProgressBar value={selected.actual_revenue ?? 0} max={selected.expected_revenue} color="green" /></div>
                    <div className="mt-1"><VarBadge exp={selected.expected_revenue} act={selected.actual_revenue ?? 0} /></div>
                  </CardContent>
                </Card>

                <Card className="border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <TrendingDown className="w-3.5 h-3.5 text-amber-600" /> المصروفات
                    </div>
                    <div className="text-xl font-black text-amber-700">{fmtMoney(selected.actual_expenses ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">مخطط: {fmtMoney(selected.expected_expenses)}</div>
                    <div className="mt-2"><ProgressBar value={selected.actual_expenses ?? 0} max={selected.expected_expenses} color="red" /></div>
                    <div className="mt-1"><VarBadge exp={selected.expected_expenses} act={selected.actual_expenses ?? 0} invert /></div>
                  </CardContent>
                </Card>
              </div>

              {/* Net profit */}
              <Card className={`border-2 ${(selected.actual_revenue ?? 0) - (selected.actual_expenses ?? 0) >= 0 ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-muted-foreground mb-1">صافي الربح الفعلي</div>
                    <div className={`text-2xl font-black ${(selected.actual_revenue ?? 0) - (selected.actual_expenses ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {fmtMoney((selected.actual_revenue ?? 0) - (selected.actual_expenses ?? 0))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">صافي مخطط</div>
                    <div className="font-bold">{fmtMoney(selected.expected_revenue - selected.expected_expenses)}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget items breakdown */}
              {items.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">تفصيل بنود الميزانية</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs">
                        <tr>
                          <th className="text-start p-3">البند</th>
                          <th className="text-end p-3">المخطط</th>
                          <th className="text-end p-3">الفعلي</th>
                          <th className="text-end p-3">الفرق</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const v = (item.actual ?? 0) - item.expected;
                          const good = v <= 0;
                          return (
                            <tr key={item.id} className="border-t">
                              <td className="p-3 font-medium">{EXPENSE_CATS.find((c) => c.value === item.category)?.label ?? item.category}</td>
                              <td className="p-3 text-end">{fmtMoney(item.expected)}</td>
                              <td className="p-3 text-end">{fmtMoney(item.actual ?? 0)}</td>
                              <td className={`p-3 text-end font-bold text-xs ${good ? "text-emerald-600" : "text-red-600"}`}>
                                {v >= 0 ? "+" : ""}{fmtMoney(v)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewBudgetDialog({ open, setOpen, onCreated, tenantId }: { open: boolean; setOpen: (v: boolean) => void; onCreated: () => void; tenantId: string | null }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"monthly" | "weekly">("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [revenue, setRevenue] = useState("");
  const [items, setItems] = useState<{ category: string; expected: string }[]>([
    { category: "salaries", expected: "" },
    { category: "rent", expected: "" },
  ]);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!label || !revenue) { toast.error("أدخل الاسم والإيراد المستهدف"); return; }
    setSaving(true);
    const totalExp = items.reduce((s, i) => s + Number(i.expected || 0), 0);
    const { data: b, error } = await  (supabase as any).from("budgets").insert({
      period_label: label, period_type: type, year, month: type === "monthly" ? month : null,
      expected_revenue: Number(revenue), expected_expenses: totalExp, tenant_id: tenantId,
    }).select("id").single();
    if (error) { setSaving(false); return toast.error(error.message); }
    const validItems = items.filter((i) => Number(i.expected) > 0);
    if (validItems.length) {
      await  (supabase as any).from("budget_items").insert(validItems.map((i) => ({ budget_id: b.id, category: i.category, expected: Number(i.expected), tenant_id: tenantId })));
    }
    setSaving(false);
    toast.success("تم إنشاء الميزانية");
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 ms-1" />ميزانية جديدة</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle>إنشاء ميزانية جديدة</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>اسم الفترة</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثال: يناير 2026" />
            </div>
            <div>
              <Label>النوع</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">شهري</SelectItem>
                  <SelectItem value="weekly">أسبوعي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>السنة</Label><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
            {type === "monthly" && <div><Label>الشهر</Label><Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} /></div>}
          </div>
          <div><Label>الإيراد المستهدف (ج.م)</Label><Input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} /></div>
          <div>
            <Label>بنود المصروفات المخططة</Label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 mt-2">
                <Select value={item.category} onValueChange={(v) => setItems((p) => p.map((x, j) => j === i ? { ...x, category: v } : x))}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="w-28" type="number" placeholder="المبلغ" value={item.expected} onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, expected: e.target.value } : x))} />
              </div>
            ))}
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setItems((p) => [...p, { category: "other", expected: "" }])}>
              <Plus className="w-3 h-3 ms-1" /> بند جديد
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الميزانية"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
