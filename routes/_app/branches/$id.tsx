import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Banknote, Receipt, Users, ClipboardList, AlertTriangle } from "lucide-react";

// @ts-expect-error routeTree is generated during Vite build after TypeScript in this project
export const Route = createFileRoute("/_app/branches/$id")({
  head: () => ({ meta: [{ title: "شاشة الفرع" }] }),
  component: BranchScreen,
});

function BranchScreen() {
  const { id } = Route.useParams() as any;
  const { hasRole, tenantId } = useAuth();
  const canUse = hasRole("owner", "ops_manager", "cs_manager", "employee", "courier");
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [cash, setCash] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [issues, setIssues] = useState({ reclean: 0, qc: 0, unpaid: 0, noDriver: 0 });

  async function load() {
    if (!canUse || !tenantId) { setLoading(false); return; }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const from = new Date(today + "T00:00:00").toISOString();
    const to = new Date(today + "T23:59:59").toISOString();
    const [b, o, ca, ex, em, reclean, qc, unpaid, noDriver] = await Promise.all([
      (supabase as any).from("branches").select("*").eq("id", id).single(),
      (supabase as any).from("orders").select("id,order_number,total,status,payment_status,created_at,customers(full_name)").eq("branch_id", id).gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }).limit(80),
      (supabase as any).from("cash_accounts").select("*").eq("branch_id", id).eq("is_active", true).order("created_at"),
      (supabase as any).from("expenses").select("id,amount,status,description,category,spent_at").eq("branch_id", id).neq("status", "void").gte("spent_at", from).lte("spent_at", to).order("spent_at", { ascending: false }).limit(80),
      (supabase as any).from("employees").select("id,full_name,job_role,station,is_active").eq("branch_id", id).eq("is_active", true).order("full_name"),
      (supabase as any).from("service_units").select("id,orders!inner(branch_id)", { count: "exact", head: true }).eq("orders.branch_id", id).eq("needs_reclean", true),
      (supabase as any).from("service_units").select("id,orders!inner(branch_id)", { count: "exact", head: true }).eq("orders.branch_id", id).eq("current_stage", "qc_failed"),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("branch_id", id).in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid"),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("branch_id", id).eq("status", "ready").is("assigned_driver_employee_id", null),
    ]);
    setBranch(b.data ?? null);
    setOrders(o.data ?? []);
    setCash(ca.data ?? []);
    setExpenses(ex.data ?? []);
    setEmployees(em.data ?? []);
    setIssues({ reclean: reclean.count ?? 0, qc: qc.count ?? 0, unpaid: unpaid.count ?? 0, noDriver: noDriver.count ?? 0 });
    setLoading(false);
  }

  useEffect(() => { load(); }, [id, tenantId, canUse]);

  const kpi = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const paidOrders = orders.filter((o) => o.payment_status === "paid").length;
    const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const cashTotal = cash.reduce((s, c) => s + Number(c.current_balance ?? 0), 0);
    return { revenue, paidOrders, activeOrders, expenseTotal, cashTotal, net: revenue - expenseTotal };
  }, [orders, expenses, cash]);

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">لا تملك صلاحية شاشة الفرع.</CardContent></Card>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><Building2 className="w-7 h-7 text-teal-600" />{branch?.name ?? "شاشة الفرع"}</h1><p className="text-sm text-muted-foreground">شاشة منفصلة للفرع: طلبات، خزنة، موظفين، مصروفات، ومشاكل تحتاج متابعة.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={load}>تحديث</Button><Button asChild><Link to="/branches">كل الفروع</Link></Button></div>
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <>
      <div className="grid md:grid-cols-4 gap-3">
        <Kpi title="دخل اليوم" value={fmtMoney(kpi.revenue)} icon={<Receipt />} />
        <Kpi title="مصروفات اليوم" value={fmtMoney(kpi.expenseTotal)} icon={<Banknote />} warn />
        <Kpi title="صافي تقريبي" value={fmtMoney(kpi.net)} icon={<Receipt />} warn={kpi.net < 0} />
        <Kpi title="رصيد خزن الفرع" value={fmtMoney(kpi.cashTotal)} icon={<Banknote />} />
      </div>
      <div className="grid md:grid-cols-4 gap-3">
        <Kpi title="طلبات اليوم" value={orders.length} icon={<ClipboardList />} />
        <Kpi title="طلبات نشطة" value={kpi.activeOrders} icon={<ClipboardList />} warn={kpi.activeOrders > 0} />
        <Kpi title="موظفون نشطون" value={employees.length} icon={<Users />} />
        <Kpi title="مشاكل مفتوحة" value={issues.reclean + issues.qc + issues.unpaid + issues.noDriver} icon={<AlertTriangle />} warn={issues.reclean + issues.qc + issues.unpaid + issues.noDriver > 0} />
      </div>

      <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900 grid md:grid-cols-4 gap-2">
        <Mini label="مرتجعات غسيل" value={issues.reclean} /><Mini label="مشاكل جودة" value={issues.qc} /><Mini label="جاهز غير مدفوع" value={issues.unpaid} /><Mini label="جاهز بلا مندوب" value={issues.noDriver} />
      </CardContent></Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">خزن الفرع</CardTitle></CardHeader><CardContent className="space-y-2">{cash.map((c) => <Row key={c.id} a={c.name} b={c.account_type} c={fmtMoney(c.current_balance)} danger={Number(c.current_balance) < 0} />)}{!cash.length && <Empty text="لا توجد خزن مربوطة بهذا الفرع" />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">موظفو الفرع</CardTitle></CardHeader><CardContent className="space-y-2">{employees.map((e) => <Row key={e.id} a={e.full_name} b={e.job_role ?? e.station ?? "موظف"} c={e.is_active ? "نشط" : "موقوف"} />)}{!employees.length && <Empty text="لا يوجد موظفون في هذا الفرع" />}</CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">طلبات اليوم في الفرع</CardTitle></CardHeader><CardContent className="space-y-2">{orders.map((o) => <Link key={o.id} to={`/orders/${o.id}` as any}><div className="rounded-xl border p-3 text-sm flex justify-between gap-2"><div><b>طلب #{o.order_number}</b><div className="text-xs text-muted-foreground">{o.customers?.full_name ?? "عميل"} · {o.status}</div></div><Badge>{fmtMoney(o.total)}</Badge></div></Link>)}{!orders.length && <Empty text="لا توجد طلبات اليوم" />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">مصروفات اليوم في الفرع</CardTitle></CardHeader><CardContent className="space-y-2">{expenses.map((e) => <Row key={e.id} a={e.description ?? "مصروف"} b={e.status === "payable" ? "آجل" : "مدفوع"} c={fmtMoney(e.amount)} danger />)}{!expenses.length && <Empty text="لا توجد مصروفات اليوم" />}</CardContent></Card>
      </div>
    </>}
  </div>;
}

function Kpi({ title, value, icon, warn = false }: { title: string; value: any; icon: React.ReactNode; warn?: boolean }) { return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{title}</div><div className="text-2xl font-black mt-2">{value}</div></CardContent></Card>; }
function Mini({ label, value }: { label: string; value: any }) { return <div className="rounded-xl bg-white/70 border border-amber-100 p-2"><div className="text-xs text-muted-foreground">{label}</div><div className="font-black">{value}</div></div>; }
function Row({ a, b, c, danger = false }: { a: string; b: string; c: any; danger?: boolean }) { return <div className="rounded-xl border p-3 text-sm flex justify-between items-center gap-2"><div><b>{a}</b><div className="text-xs text-muted-foreground">{b}</div></div><Badge variant={danger ? "destructive" : "secondary"}>{c}</Badge></div>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-muted-foreground">{text}</div>; }
