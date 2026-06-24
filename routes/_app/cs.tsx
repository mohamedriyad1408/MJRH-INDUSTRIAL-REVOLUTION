import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, AlertTriangle, Zap, PlusCircle, Eye, Timer, CreditCard, MessageCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/cs")({
  head: () => ({ meta: [{ title: "لوحة خدمة العملاء" }] }),
  component: CsDashboard,
});

type ActiveOrder = {
  id: string; order_number: number; status: string; is_urgent: boolean;
  created_at: string; customers?: { full_name: string } | null;
  task_assignments?: { employee_id: string; assigned_at: string; employees?: { full_name: string } | null }[];
};

function CsDashboard() {
  const { hasRole } = useAuth();
  const allowed = hasRole("cs_manager", "owner", "ops_manager");
  const [stats, setStats] = useState({ today: 0, late: 0, urgent: 0 });
  const [active, setActive] = useState<ActiveOrder[]>([]);
  const [attention, setAttention] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const [a, b, u, act, unpaidReady, proofs, queuedMsgs, invoiceReview] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
        supabase.from("orders").select("id", { count: "exact", head: true }).lt("promised_delivery_at", new Date().toISOString()).not("status", "in", "(delivered,cancelled)"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("is_urgent", true).not("status", "in", "(delivered,cancelled)"),
        supabase.from("orders")
          .select("id, order_number, status, is_urgent, created_at, customers(full_name), task_assignments(employee_id, assigned_at, employees(full_name))")
          .in("status", ["received", "cleaning", "ironing", "packing"])
          .order("is_urgent", { ascending: false }).order("created_at"),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid"),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("payment_verification_status", ["pending_review", "underpaid"]),
        (supabase as any).from("customer_messages").select("id", { count: "exact", head: true }).eq("status", "queued"),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["packing", "ready"]).is("invoice_finalized_at", null),
      ]);
      setStats({ today: a.count ?? 0, late: b.count ?? 0, urgent: u.count ?? 0 });
      setActive((act.data ?? []) as any);
      setAttention([
        { label: "طلبات جاهزة غير مدفوعة", count: unpaidReady.count ?? 0, href: "/receivables", tone: "amber", icon: CreditCard },
        { label: "إيصالات تحتاج مراجعة", count: proofs.count ?? 0, href: "/orders", tone: "red", icon: CreditCard },
        { label: "رسائل واتساب جاهزة", count: queuedMsgs.count ?? 0, href: "/crm", tone: "blue", icon: MessageCircle },
        { label: "فواتير تحتاج اعتماد", count: invoiceReview.count ?? 0, href: "/orders", tone: "amber", icon: FileText },
      ].filter((x) => x.count > 0));
      setLoading(false);
    })();
  }, [allowed]);

  if (!allowed) return <Card className="p-8 text-center">صلاحية خدمة العملاء أو المالك فقط.</Card>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">لوحة خدمة العملاء</h1>
          <p className="text-sm text-muted-foreground">متابعة الطلبات قيد التشغيل</p>
        </div>
        <Button asChild><Link to="/orders/new"><PlusCircle className="w-4 h-4 ms-1" /> طلب جديد</Link></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="طلبات اليوم" value={stats.today} icon={Calendar} />
        <StatCard label="طلبات متأخرة" value={stats.late} icon={AlertTriangle} tone="text-destructive" />
        <StatCard label="طلبات مستعجلة" value={stats.urgent} icon={Zap} tone="text-amber-600" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="font-bold mb-3">قيد التشغيل ({active.length})</div>
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto my-6" /> : active.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">لا توجد طلبات قيد التشغيل</div>
          ) : (
            <div className="space-y-2">
              {active.map((o) => {
                const firstAssign = (o.task_assignments ?? []).sort((a, b) =>
                  new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime())[0];
                const startMs = firstAssign ? new Date(firstAssign.assigned_at).getTime() : new Date(o.created_at).getTime();
                const mins = Math.floor((now - startMs) / 60000);
                const h = Math.floor(mins / 60), m = mins % 60;
                const lastAssign = (o.task_assignments ?? [])[o.task_assignments!.length - 1];
                return (
                  <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        #{o.order_number}
                        {o.is_urgent && <Badge className="bg-amber-500"><Zap className="w-3 h-3" /></Badge>}
                        <Badge variant="secondary">{({received:"استلام",cleaning:"تنظيف",ironing:"كي",packing:"تغليف"} as any)[o.status]}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.customers?.full_name ?? "—"}
                        {lastAssign?.employees?.full_name && ` • مُكلَّف: ${lastAssign.employees.full_name}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-mono tabular-nums">
                      <Timer className="w-3 h-3" /> {h}س {String(m).padStart(2, "0")}د
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/orders/$id" params={{ id: o.id }}><Eye className="w-4 h-4" /></Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone?: string }) {
  return (
    <Link to="/orders" className="block">
      <Card className="hover:shadow-md transition">
        <CardContent className="p-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{label}</span><Icon className="w-4 h-4" />
          </div>
          <div className={`text-3xl font-bold mt-2 ${tone ?? ""}`}>{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
