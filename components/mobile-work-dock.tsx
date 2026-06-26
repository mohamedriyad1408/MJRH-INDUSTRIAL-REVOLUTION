import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CheckCircle2, ClipboardList, Map, PackageCheck, Shirt, Sparkles, Truck, Wand2, Wind } from "lucide-react";

type Task = { title: string; detail: string; href: string; count: number; tone?: "red" | "amber" | "teal" | "violet"; icon: React.ReactNode };

const STATION_AR: Record<string, string> = { reception: "الاستقبال", cleaning: "الغسيل", drying_assembly: "التجفيف والتجميع", ironing: "الكي", packing: "التغليف", driver: "المندوب" };

export function MobileWorkDock() {
  const { user, hasRole, tenantId } = useAuth();
  const [open, setOpen] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const isManager = hasRole("owner", "ops_manager", "cs_manager");
  const station = employee?.job_role === "driver" ? "driver" : employee?.station;

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("employees").select("id,full_name,station,job_role,branch_id,profile_id,email").or(`profile_id.eq.${user.id},email.eq.${user.email}`).maybeSingle().then(({ data }: any) => setEmployee(data ?? null));
  }, [user]);

  async function loadCounts() {
    if (!tenantId) return;
    const branchId = employee?.branch_id;
    const addBranch = (q: any) => branchId && !isManager ? q.eq("branch_id", branchId) : q;
    const [received, cleaning, drying, ironing, packing, ready, pickups, unpaid, late] = await Promise.all([
      addBranch((supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "received")).then((r: any) => r).catch(() => ({ count: 0 })),
      addBranch((supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "cleaning")).then((r: any) => r).catch(() => ({ count: 0 })),
      (supabase as any).from("drying_assembly_queue").select("id", { count: "exact", head: true }).then((r: any) => r).catch(() => ({ count: 0 })),
      addBranch((supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "ironing")).then((r: any) => r).catch(() => ({ count: 0 })),
      addBranch((supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "packing")).then((r: any) => r).catch(() => ({ count: 0 })),
      addBranch((supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "ready").is("assigned_driver_employee_id", null)).then((r: any) => r).catch(() => ({ count: 0 })),
      addBranch((supabase as any).from("pickup_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "assigned"])).then((r: any) => r).catch(() => ({ count: 0 })),
      addBranch((supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["ready", "out_for_delivery"]).neq("payment_status", "paid")).then((r: any) => r).catch(() => ({ count: 0 })),
      addBranch((supabase as any).from("orders").select("id", { count: "exact", head: true }).not("status", "in", "(delivered,cancelled)").lt("promised_delivery_at", new Date().toISOString())).then((r: any) => r).catch(() => ({ count: 0 })),
    ]);
    setCounts({ received: received.count ?? 0, cleaning: cleaning.count ?? 0, drying: drying.count ?? 0, ironing: ironing.count ?? 0, packing: packing.count ?? 0, ready: ready.count ?? 0, pickups: pickups.count ?? 0, unpaid: unpaid.count ?? 0, late: late.count ?? 0 });
  }

  useEffect(() => { loadCounts(); const t = setInterval(loadCounts, 60000); return () => clearInterval(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tenantId, employee?.branch_id, station]);

  const tasks: Task[] = useMemo(() => {
    if (isManager) return [
      { title: "شغّل اليوم", detail: "ابدأ/راقب/أنه اليوم بخطوات واضحة", href: "/daily-operations", count: counts.late + counts.unpaid, tone: counts.late ? "red" : "teal", icon: <Wand2 className="w-4 h-4" /> },
      { title: "مركز اليوم", detail: "كل المشاكل المهمة في شاشة واحدة", href: "/today", count: counts.late + counts.ready + counts.pickups, tone: "amber", icon: <ClipboardList className="w-4 h-4" /> },
      { title: "الخريطة", detail: "استلامات وتوصيلات ومناديب", href: "/live-map", count: counts.pickups + counts.ready, tone: "violet", icon: <Map className="w-4 h-4" /> },
    ];
    if (station === "reception") return [
      { title: "طلب جديد", detail: "استقبل العميل وسجل القطع", href: "/orders/new", count: counts.received, tone: "teal", icon: <ClipboardList className="w-4 h-4" /> },
      { title: "كل الطلبات", detail: "راجع الفواتير والجاهز", href: "/orders", count: counts.unpaid, tone: "amber", icon: <PackageCheck className="w-4 h-4" /> },
    ];
    if (station === "cleaning") return [{ title: "مهام الغسيل", detail: "نظّف القطع ثم سلمها للتجفيف والتجميع", href: "/stations/cleaning", count: counts.received + counts.cleaning, tone: "teal", icon: <Sparkles className="w-4 h-4" /> }, { title: "التجفيف والتجميع", detail: "راجع المارك وجهز القطع للكي", href: "/stations/drying-assembly", count: counts.drying, tone: "violet", icon: <Wind className="w-4 h-4" /> }];
    if (station === "drying_assembly") return [{ title: "التجفيف والتجميع", detail: "راجع المارك وجهز القطع للكي", href: "/stations/drying-assembly", count: counts.drying, tone: "violet", icon: <Wind className="w-4 h-4" /> }];
    if (station === "ironing") return [{ title: "مهام الكي", detail: "قطعك الحالية والمنتظرة", href: "/stations/ironing", count: counts.ironing, tone: "violet", icon: <Shirt className="w-4 h-4" /> }];
    if (station === "packing") return [{ title: "مهام التغليف", detail: "راجع القطع وجهزها للتسليم", href: "/stations/packing", count: counts.packing, tone: "amber", icon: <PackageCheck className="w-4 h-4" /> }];
    if (station === "driver") return [{ title: "مهام المندوب", detail: "استلامات وتوصيلات اليوم", href: "/driver", count: counts.pickups + counts.ready, tone: "teal", icon: <Truck className="w-4 h-4" /> }];
    return [{ title: "مهامي الآن", detail: "افتح صفحتك التشغيلية", href: "/today", count: counts.late, tone: "teal", icon: <CheckCircle2 className="w-4 h-4" /> }];
  }, [isManager, station, counts]);

  const total = tasks.reduce((s, t) => s + Number(t.count || 0), 0);
  if (!user) return null;

  return <div className="md:hidden fixed bottom-4 left-4 z-40">
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="h-14 rounded-full px-5 shadow-2xl bg-gradient-to-l from-violet-700 via-slate-900 to-teal-600 text-white border border-white/20">
          <Wand2 className="w-5 h-5 ms-2 text-teal-200" /> مهامي الآن {total > 0 && <Badge className="me-2 bg-amber-400 text-slate-950">{total}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl p-4 bg-gradient-to-br from-white to-teal-50 max-h-[82vh] overflow-auto" dir="rtl">
        <SheetHeader className="text-right">
          <SheetTitle className="text-xl font-black">مهامك السريعة</SheetTitle>
          <SheetDescription>{employee?.full_name ? `${employee.full_name} — ` : ""}{STATION_AR[station ?? ""] ?? "تشغيل اليوم"}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 mt-4">
          {tasks.map((t) => <Link key={t.href + t.title} to={t.href as any} onClick={() => setOpen(false)}>
            <div className={`rounded-3xl border p-4 shadow-sm ${t.tone === "red" ? "bg-red-50 border-red-200" : t.tone === "amber" ? "bg-amber-50 border-amber-200" : t.tone === "violet" ? "bg-violet-50 border-violet-200" : "bg-teal-50 border-teal-200"}`}>
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-black">{t.icon}{t.title}</div><Badge variant={t.count ? "destructive" : "secondary"}>{t.count}</Badge></div>
              <div className="text-sm text-muted-foreground mt-1">{t.detail}</div>
            </div>
          </Link>)}
        </div>
        <div className="mt-4 rounded-3xl bg-slate-900 text-white p-4 text-center font-bold">ركز في المهمة الحالية، وكل خطوة بتقربنا من يوم أنجح ✨</div>
      </SheetContent>
    </Sheet>
  </div>;
}
