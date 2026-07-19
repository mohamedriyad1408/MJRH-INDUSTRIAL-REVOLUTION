import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Loader2, Users, Receipt, Banknote, ClipboardList, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/branches/$id")({
  head: () => ({ meta: [{ title: "شاشة الفرع" }] }),
  component: BranchDashboardPage,
});

function BranchDashboardPage() {
  const { t, dir } = useI18n();
  const { id } = Route.useParams();
  const { hasRole, tenantId } = useAuth();
  const canUse = hasRole("owner", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<any | null>(null);
  const [cash, setCash] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [issues, setIssues] = useState({ reclean: 0, qc: 0, unpaid: 0, noDriver: 0 });
  const [kpi, setKpi] = useState({ revenue: 0, expenseTotal: 0, net: 0, cashTotal: 0, activeOrders: 0 });

  async function load() {
    if (!canUse || !tenantId) { setLoading(false); return; }
    setLoading(true);
    const date = new Date().toISOString().slice(0, 10);
    const [bRes, cRes, eRes, oRes, expRes, suRes, qcRes, rDriverRes] = await Promise.all([
      supabase.from("branches").select("*").eq("id", id).maybeSingle(),
      supabase.from("cash_accounts").select("*").eq("branch_id", id).eq("is_active", true),
      supabase.from("employees").select("*").eq("branch_id", id),
      supabase.from("orders").select("*,customers(full_name)").eq("branch_id", id).gte("created_at", `${date}T00:00:00Z`),
      supabase.from("expenses").select("*").eq("branch_id", id).gte("spent_at", date),
      supabase.from("service_units").select("id").eq("needs_reclean", true),
      supabase.from("service_units").select("id").eq("current_stage", "qc_failed"),
      supabase.from("orders").select("id").eq("branch_id", id).eq("status", "ready").is("assigned_driver_employee_id", null),
    ]);
    if (bRes.error) toast.error(bRes.error.message);
    const ords = oRes.data ?? [];
    const exps = expRes.data ?? [];
    const cs = cRes.data ?? [];

    const validOrds = ords.filter((o: any) => o.status !== "cancelled");
    const rev = validOrds.reduce((s: number, x: any) => s + Number(x.total ?? 0), 0);
    const exp = exps.reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0);
    const cTotal = cs.reduce((s: number, x: any) => s + Number(x.current_balance ?? 0), 0);
    const actOrds = ords.filter((o: any) => !["delivered", "cancelled"].includes(o.status)).length;
    const unpaidReady = ords.filter((o: any) => ["ready", "out_for_delivery"].includes(o.status) && o.payment_status === "unpaid").length;

    setBranch(bRes.data ?? null); setCash(cs); setEmployees(eRes.data ?? []); setOrders(ords); setExpenses(exps);
    setKpi({ revenue: rev, expenseTotal: exp, net: rev - exp, cashTotal: cTotal, activeOrders: actOrds });
    setIssues({ reclean: suRes.data?.length ?? 0, qc: qcRes.data?.length ?? 0, unpaid: unpaidReady, noDriver: rDriverRes.data?.length ?? 0 });
    setLoading(false);
  }
  useEffect(() => { load(); }, [id, canUse, tenantId]);

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("branchView.errAccess", "لا تملك صلاحية شاشة الفرع.")}</CardContent></Card>;
  const curr = t("common.egp");

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><Building2 className="w-7 h-7 text-teal-600" />{branch?.name ?? t("branchView.pageTitle", "شاشة الفرع")}</h1><p className="text-sm text-muted-foreground">{t("branchView.subtitle", "شاشة منفصلة للفرع: طلبات، خزنة، موظفين، مصروفات، ومشاكل تحتاج متابعة.")}</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={load}>{t("common.refresh")}</Button><Button asChild><Link to={"/$tenant/branches" as any}>{t("branchView.btnAllBranches", "كل الفروع")}</Link></Button></div>
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi title={t("branchView.revToday", "دخل اليوم")} value={fmtMoney(kpi.revenue, curr)} icon={<Receipt />} />
        <Kpi title={t("branchView.expToday", "مصروفات اليوم")} value={fmtMoney(kpi.expenseTotal, curr)} icon={<Banknote />} warn />
        <Kpi title={t("branchView.netEst", "صافي تقريبي")} value={fmtMoney(kpi.net, curr)} icon={<Receipt />} warn={kpi.net < 0} />
        <Kpi title={t("branchView.cashTotal", "رصيد خزن الفرع")} value={fmtMoney(kpi.cashTotal, curr)} icon={<Banknote />} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi title={t("branchView.ordersToday", "طلبات اليوم")} value={orders.length} icon={<ClipboardList />} />
        <Kpi title={t("branchView.activeOrders", "طلبات نشطة")} value={kpi.activeOrders} icon={<ClipboardList />} warn={kpi.activeOrders > 0} />
        <Kpi title={t("branchView.activeStaff", "موظفون نشطون")} value={employees.length} icon={<Users />} />
        <Kpi title={t("branchView.openIssues", "مشاكل مفتوحة")} value={issues.reclean + issues.qc + issues.unpaid + issues.noDriver} icon={<AlertTriangle />} warn={issues.reclean + issues.qc + issues.unpaid + issues.noDriver > 0} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
        <Mini label={t("branchView.issueReclean", "مرتجعات غسيل")} value={issues.reclean} /><Mini label={t("branchView.issueQc", "مشاكل جودة")} value={issues.qc} /><Mini label={t("branchView.issueUnpaid", "جاهز غير مدفوع")} value={issues.unpaid} /><Mini label={t("branchView.issueNoDriver", "جاهز بلا مندوب")} value={issues.noDriver} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">{t("branchView.cashTitle", "خزن الفرع")}</CardTitle></CardHeader><CardContent className="space-y-2">{cash.map((c) => <Row key={c.id} a={c.name} b={c.account_type} c={fmtMoney(c.current_balance, curr)} danger={Number(c.current_balance) < 0} />)}{!cash.length && <Empty text={t("branchView.cashEmpty", "لا توجد خزن مربوطة بهذا الفرع")} />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("branchView.staffTitle", "موظفو الفرع")}</CardTitle></CardHeader><CardContent className="space-y-2">{employees.map((e) => <Row key={e.id} a={e.full_name} b={e.job_role ?? e.station ?? t("common.employee")} c={e.is_active ? t("branchView.staffActive", "نشط") : t("branchView.staffInactive", "موقوف")} />)}{!employees.length && <Empty text={t("branchView.staffEmpty", "لا يوجد موظفون في هذا الفرع")} />}</CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">{t("branchView.ordersTitle", "طلبات اليوم في الفرع")}</CardTitle></CardHeader><CardContent className="space-y-2">{orders.map((o) => <Link key={o.id} to={`/orders/${o.id}` as any}><div className="rounded-xl border p-3 text-sm flex justify-between gap-2"><div><b>{t("order.orderNo", "طلب #{order}").replace("{order}", String(o.order_number))}</b><div className="text-xs text-muted-foreground">{o.customers?.full_name ?? t("branchView.orderCustomer", "عميل")} · {o.status}</div></div><Badge>{fmtMoney(o.total, curr)}</Badge></div></Link>)}{!orders.length && <Empty text={t("branchView.ordersEmpty", "لا توجد طلبات اليوم")} />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("branchView.expTitle", "مصروفات اليوم في الفرع")}</CardTitle></CardHeader><CardContent className="space-y-2">{expenses.map((e) => <Row key={e.id} a={e.description ?? t("branchView.expDesc", "مصروف")} b={e.status === "payable" ? t("branchView.expPayable", "آجل") : t("branchView.expPaid", "مدفوع")} c={fmtMoney(e.amount, curr)} danger />)}{!expenses.length && <Empty text={t("branchView.expEmpty", "لا توجد مصروفات اليوم")} />}</CardContent></Card>
      </div>
    </div>}
  </div>;
}

function Kpi({ title, value, icon, warn = false }: { title: string; value: any; icon: React.ReactNode; warn?: boolean }) {
  return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4 flex items-center justify-between gap-2"><div><div className="text-xs text-muted-foreground">{title}</div><div className="text-xl font-bold mt-1">{value}</div></div><div className={`p-2 rounded-xl ${warn ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{icon}</div></CardContent></Card>;
}
function Mini({ label, value }: { label: string; value: number }) { return <div className={`rounded-xl border p-2 text-xs ${value > 0 ? "bg-red-50 border-red-200 font-bold text-red-800" : "bg-card text-muted-foreground"}`}>{label}<div>{value}</div></div>; }
function Row({ a, b, c, danger = false }: { a: string; b: string; c: string; danger?: boolean }) { return <div className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><div className="flex-1 font-bold">{a}</div><Badge variant={danger ? "destructive" : "secondary"}>{b}</Badge><div className="font-black">{c}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-muted-foreground">{text}</div>; }
