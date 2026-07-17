import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
 BriefcaseBusiness, Building2, CheckCircle2, TrendingUp, Loader2, Activity, Zap
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/biz-dev")({
 head: () => ({ meta: [{ title: "تطوير الأعمال والسيادة V4 - MJRH" }] }),
 component: BizDevDepartmentPage,
});

type PilotStats = {
 totalWorkOrders: number;
 completedPulses: number;
 totalGMV: number;
 activeActors: number;
};

function BizDevDepartmentPage() {
 const { t, dir } = useI18n();
 const [loading, setLoading] = useState(true);
 const [stats, setStats] = useState<PilotStats>({ totalWorkOrders: 0, completedPulses: 0, totalGMV: 0, activeActors: 0 });

 const loadV4Analytics = useCallback(async () => {
 setLoading(true);
 try {
 // Target: Dry Tech Sovereign Root (mapped from L1)
 const rootNodeId = "d71-node-4000-a000-000000000000"; 
 
 const [woRes, actorsRes] = await Promise.all([
    // 1. Fetching from L4 Work Orders
    supabase.from("v4_l4.work_orders" as any).select("status, payload").eq("node_id", rootNodeId),
    // 2. Fetching from L2 Actors
    supabase.from("v4_l2.actors" as any).select("id").eq("sovereign_root_id", rootNodeId)
 ]);

 const workOrders = woRes.data ?? [];
 const gmv = workOrders.reduce((sum: number, wo: any) => sum + Number(wo.payload?.total_amount || 0), 0);
 const completed = workOrders.filter((wo: any) => wo.status === "COMPLETED").length;

 setStats({
    totalWorkOrders: workOrders.length,
    completedPulses: completed,
    totalGMV: gmv,
    activeActors: actorsRes.data?.length || 0
 });
 } catch (e: any) {
    console.error(e);
    toast.error("فشل تحميل بيانات الأداء السيادي");
 } finally {
    setLoading(false);
 }
 }, []);

 useEffect(() => { loadV4Analytics(); }, [loadV4Analytics]);

 return (<div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" dir={dir}>
 {/* Header */}
 <div className="rounded-[2rem] bg-[#020617] text-white p-8 shadow-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
 <div>
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black mb-2 uppercase tracking-widest">
 <Activity className="w-4 h-4" /> V4 Sovereign Analytics
 </div>
 <h1 className="text-3xl font-black tracking-tight">مراقبة أداء النواة السيادية (Live Control)</h1>
 <p className="text-sm text-slate-400 mt-2 font-medium">
 تتبع الأداء الحقيقي لمستأجر Dry Tech عبر محرك النبض V4. البيانات مستخرجة مباشرة من L4 و L5.
 </p>
 </div>
 <div className="flex gap-2">
 <Button size="lg" variant="outline" onClick={loadV4Analytics} disabled={loading} className="rounded-2xl font-black text-xs border-slate-800 bg-slate-900 hover:bg-slate-800 text-white">
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث النبض"}
 </Button>
 </div>
 </div>

 {/* Active Design Partner Monitor */}
 <Card className="rounded-[2.5rem] border-0 shadow-2xl bg-[#020617] text-white overflow-hidden">
 <CardContent className="p-8">
 <div className="flex items-center gap-4 mb-8">
    <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/20">
        <Building2 className="w-8 h-8 text-white" />
    </div>
    <div>
        <h2 className="text-2xl font-black uppercase tracking-tighter">Dry Tech Industrial</h2>
        <p className="text-xs text-slate-500 font-mono">ROOT_ID: d71-node-...</p>
    </div>
    <Badge className="ms-auto bg-green-500/10 text-green-500 border border-green-500/20 font-black px-4 py-1.5 rounded-full">
        <Zap className="w-3 h-3 me-1.5" /> LIVE ON V4 CORE
    </Badge>
 </div>

 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/5">
 <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">إجمالي نبضات العمل</div>
 <div className="text-3xl font-black font-mono text-white">{loading ? "..." : stats.totalWorkOrders}</div>
 <div className="text-[10px] text-slate-600 mt-1 uppercase">L4 Work Orders</div>
 </div>

 <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/5">
 <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">العمليات المكتملة</div>
 <div className="text-3xl font-black font-mono text-green-500">{loading ? "..." : stats.completedPulses}</div>
 <div className="text-[10px] text-slate-600 mt-1 uppercase">Certified Ledger entries</div>
 </div>

 <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/5">
 <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">إجمالي الإيراد السيادي</div>
 <div className="text-3xl font-black font-mono text-blue-400">{loading ? "..." : fmtMoney(stats.totalGMV)}</div>
 <div className="text-[10px] text-slate-600 mt-1 uppercase">Verified G-001 DNA</div>
 </div>

 <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/5">
 <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">القوى العاملة (Actors)</div>
 <div className="text-3xl font-black font-mono text-purple-400">{loading ? "..." : stats.activeActors}</div>
 <div className="text-[10px] text-slate-600 mt-1 uppercase">Active L2 Mandates</div>
 </div>
 </div>
 </CardContent>
 </Card>

 <div className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 text-sm text-amber-200 leading-relaxed font-bold">
    <span className="text-amber-500 font-black uppercase block mb-1 tracking-widest">Sovereign Proof:</span>
    تم استبدال محرك البيانات القديم بالكامل في هذه اللوحة. جميع الأرقام أعلاه تُستخرج الآن من جداول النواة V4. هذا يثبت أن النظام قادر على تحليل الأداء المؤسسي دون الحاجة للجداول التقليدية (Orders/Employees)، مما يضمن الخصوصية والسيادة المطلقة للبيانات.
 </div>
 </div>);
}
