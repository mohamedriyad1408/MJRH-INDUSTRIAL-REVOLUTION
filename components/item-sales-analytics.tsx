import { useEffect, useState, useMemo } from"react";
import { supabase } from"@/integrations/supabase/client";
import { useAuth } from"@/core/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Badge } from"@/components/ui/badge";
import { Loader2, Download, TrendingUp, Package, Sparkles, Shirt, Search, Calendar, Award, DollarSign, BarChart3, Filter } from"lucide-react";
import { fmtMoney } from"@/lib/format";
import { toast } from"sonner";
import { useI18n } from"@/lib/i18n";
import { PosCategoryTabs, type ServiceTypeFilter } from"@/components/pos-category-tabs";

type TimePeriod ="weekly"|"monthly"|"yearly"|"all";

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

type ItemStat = {
 id: string;
 name: string;
 category: string;
 service_type: string;
 catalogPrice: number;
 qtySold: number;
 ordersCount: number;
 totalGMV: number;
 revenueSharePct: number;
};

export function ItemSalesAnalyticsTab({ branchId ="all"}: { branchId?: string }) {
 const { tenantId } = useAuth();
 const { t, dir } = useI18n();
 const [period, setPeriod] = useState<TimePeriod>("monthly");
 const [year, setYear] = useState(new Date().getFullYear());
 const [month, setMonth] = useState(new Date().getMonth());
 const [categoryTab, setCategoryTab] = useState("all");
 const [serviceType, setServiceType] = useState<ServiceTypeFilter>("all");
 const [search, setSearch] = useState("");
 const [loading, setLoading] = useState(true);
 const [stats, setStats] = useState<ItemStat[]>([]);
 const [totalGMV, setTotalGMV] = useState(0);
 const [totalQty, setTotalQty] = useState(0);

 async function loadData() {
 if (!tenantId) return;
 setLoading(true);
 try {
 // 1. Calculate date range
 const now = new Date();
 let fromISO ="";
 let toISO ="";
 if (period ==="weekly") {
 const d = new Date();
 d.setDate(d.getDate() - 7);
 d.setHours(0, 0, 0, 0);
 fromISO = d.toISOString();
 toISO = now.toISOString();
 } else if (period ==="monthly") {
 const fromDate = new Date(year, month, 1, 0, 0, 0);
 const toDate = new Date(year, month + 1, 0, 23, 59, 59);
 fromISO = fromDate.toISOString();
 toISO = toDate.toISOString();
 } else if (period ==="yearly") {
 const fromDate = new Date(year, 0, 1, 0, 0, 0);
 const toDate = new Date(year, 11, 31, 23, 59, 59);
 fromISO = fromDate.toISOString();
 toISO = toDate.toISOString();
 }

 // 2. Fetch active catalog items
 const { data: catData, error: catErr } = await supabase
 .from("service_items")
 .select("id,name,unit_price,service_type,category")
 .eq("tenant_id", tenantId)
 .eq("is_active", true)
 .order("name");
 if (catErr) throw catErr;

 // 3. Fetch sold items in period (excluding cancelled orders!)
 let query = supabase
 .from("order_items")
 .select("name,qty,unit_price,line_total,service_type,order_id,orders!inner(id,status,created_at,branch_id)")
 .neq("orders.status","cancelled");

 if (period !=="all"&& fromISO && toISO) {
 query = query.gte("orders.created_at", fromISO).lte("orders.created_at", toISO);
 }
 if (branchId && branchId !=="all") {
 query = query.eq("orders.branch_id", branchId);
 }

 const { data: soldRows, error: soldErr } = await query;
 if (soldErr) throw soldErr;

 // 4. Map & aggregate
 const itemStatsMap = new Map<string, {
 id: string;
 name: string;
 category: string;
 service_type: string;
 catalogPrice: number;
 qtySold: number;
 ordersSet: Set<string>;
 totalGMV: number;
 }>();

 (catData || []).forEach((item: any) => {
 const key = (item.name ||"").trim().toLowerCase();
 itemStatsMap.set(key, {
 id: item.id,
 name: item.name,
 category: item.category ||"دراى كلين",
 service_type: item.service_type ||"both",
 catalogPrice: Number(item.unit_price || 0),
 qtySold: 0,
 ordersSet: new Set<string>(),
 totalGMV: 0,
 });
 });

 let sumGMV = 0;
 let sumQty = 0;

 (soldRows || []).forEach((row: any) => {
 const key = (row.name ||"").trim().toLowerCase();
 let stat = itemStatsMap.get(key);
 if (!stat) {
 stat = {
 id:"custom-"+ key,
 name: row.name ||"صنف غير معروف",
 category:"أصناف مخصصة / أخرى",
 service_type: row.service_type ||"both",
 catalogPrice: Number(row.unit_price || 0),
 qtySold: 0,
 ordersSet: new Set<string>(),
 totalGMV: 0,
 };
 itemStatsMap.set(key, stat);
 }
 const q = Math.max(1, Number(row.qty || 1));
 const price = Number(row.unit_price || stat.catalogPrice || 0);
 const lineVal = Number(row.line_total || q * price);
 stat.qtySold += q;
 stat.totalGMV += lineVal;
 sumQty += q;
 sumGMV += lineVal;
 if (row.order_id || (row.orders && row.orders.id)) {
 stat.ordersSet.add(row.order_id || row.orders.id);
 }
 });

 const aggregated: ItemStat[] = Array.from(itemStatsMap.values()).map(s => ({
 id: s.id,
 name: s.name,
 category: s.category,
 service_type: s.service_type,
 catalogPrice: s.catalogPrice,
 qtySold: s.qtySold,
 ordersCount: s.ordersSet.size,
 totalGMV: s.totalGMV,
 revenueSharePct: sumGMV > 0 ? (s.totalGMV / sumGMV) * 100 : 0,
 })).sort((a, b) => b.qtySold - a.qtySold || b.totalGMV - a.totalGMV);

 setStats(aggregated);
 setTotalGMV(sumGMV);
 setTotalQty(sumQty);
 } catch (e: any) {
 toast.error("فشل تحميل إحصائيات مبيعات الأصناف:"+ (e?.message ||""));
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 loadData();
 }, [tenantId, period, year, month, branchId]);

 const filteredStats = useMemo(() => {
 const q = search.trim().toLowerCase();
 return stats.filter(s => {
 const byCat = categoryTab ==="all"|| s.category === categoryTab || (categoryTab ==="رجالي"&& !s.category);
 const byType = !serviceType || serviceType ==="all"|| s.service_type === serviceType;
 const bySearch = !q || s.name.toLowerCase().includes(q);
 return byCat && byType && bySearch;
 });
 }, [stats, categoryTab, serviceType, search]);

 const topVolumeItem = useMemo(() => {
 return stats.length > 0 && stats[0].qtySold > 0 ? stats[0] : null;
 }, [stats]);

 const topRevenueItem = useMemo(() => {
 const sorted = [...stats].sort((a, b) => b.totalGMV - a.totalGMV);
 return sorted.length > 0 && sorted[0].totalGMV > 0 ? sorted[0] : null;
 }, [stats]);

 function exportCSV() {
 if (!stats.length) return;
 const periodLabel = period ==="weekly"?"الأسبوع الحالي": period ==="monthly"?`${MONTHS[month]} ${year}`: period ==="yearly"?`سنة ${year}`:"كل الأوقات";
 const rows = [
 ["تقرير مبيعات وحركة إنتاج الأصناف - MJRH v2.6 Hybrid"],
 ["الفترة الزمنية:", periodLabel],
 ["إجمالي القطع المباعة:", String(totalQty)],
 ["إجمالي الإيرادات المحققة:", String(totalGMV)],
 [""],
 ["# الترتيب","اسم الصنف","المبوبة (Category)","نوع الخدمة","سعر الكتالوج","العدد المباع (Qty)","عدد الفواتير","إجمالي الإيراد (GMV)","نسبة المساهمة %"]
 ];
 stats.forEach((s, idx) => {
 rows.push([
 String(idx + 1),
`"${s.name}"`,
 s.category,
 s.service_type ==="both"?"تنظيف وكي": s.service_type ==="ironing"?"كي فقط":"تصليح",
 String(s.catalogPrice),
 String(s.qtySold),
 String(s.ordersCount),
 String(s.totalGMV),
`${s.revenueSharePct.toFixed(1)}%`
 ]);
 });
 const csv = rows.map((r) => r.join(",")).join("\n");
 const blob = new Blob(["\uFEFF"+ csv], { type:"text/csv;charset=utf-8;"});
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a"); a.href = url; a.download =`mjrh-item-sales-${period}-${Date.now()}.csv`; a.click();
 }

 function typeLabel(s: string) {
 return s ==="both"?"تنظيف وكي": s ==="ironing"?"كي فقط":"تصليح/خياطة";
 }

 return (
 <div className="space-y-6"dir={dir}>
 {/* Time Period Selector Bar */}
 <Card className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white border-0 shadow-xl overflow-hidden">
 <CardContent className="p-5 space-y-4">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <h2 className="text-xl font-black flex items-center gap-2">
 <BarChart3 className="w-6 h-6 text-teal-400"/>
 <span>لوحة تحليلات مبيعات وحركة إنتاج الأصناف (Item Sales & Production Intelligence)</span>
 </h2>
 <p className="text-xs text-teal-200 mt-1">تتبع دقيق لعدد القطع المباعة وإيراد كل صنف من كتالوج Dry Tech (123 صنف) في الفترات الأسبوعية، الشهرية، والسنوية.</p>
 </div>
 <div className="flex flex-wrap gap-2">
 <Button size="sm"onClick={exportCSV} className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black rounded-xl text-xs">
 <Download className="w-4 h-4 ms-1"/> تصدير تقرير الأصناف (Excel / CSV)
 </Button>
 <Button size="sm"variant="secondary"onClick={loadData} disabled={loading} className="rounded-xl text-xs font-bold">
 {loading ? <Loader2 className="w-4 h-4 animate-spin"/> :"تحديث البيانات"}
 </Button>
 </div>
 </div>

 <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
 <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white/10 border border-white/15">
 {[
 { id:"weekly", label:"الأسبوع الحالي (7 أيام)"},
 { id:"monthly", label:"الشهر الحالي (30 يوم)"},
 { id:"yearly", label:"السنة الحالية (365 يوم)"},
 { id:"all", label:"التراكمي الشامل (كل الأوقات)"},
 ].map(t => (
 <button
 key={t.id}
 type="button"
 onClick={() => setPeriod(t.id as TimePeriod)}
 className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
 period === t.id ?"bg-teal-400 text-slate-950 shadow-md scale-[1.02]":"text-white/80 hover:bg-white/10"
 }`}
 >
 <span>{t.label}</span>
 </button>
))}
 </div>

 {period ==="monthly"&& (
 <div className="flex items-center gap-2">
 <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
 <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white font-bold text-xs h-9 rounded-xl"><SelectValue /></SelectTrigger>
 <SelectContent>{MONTHS.map((m, idx) =><SelectItem key={idx} value={String(idx)} className="text-xs font-bold">{m}</SelectItem>)}</SelectContent>
 </Select>
 <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
 <SelectTrigger className="w-24 bg-white/10 border-white/20 text-white font-bold text-xs h-9 rounded-xl"><SelectValue /></SelectTrigger>
 <SelectContent>{[2025, 2026, 2027].map((y) =><SelectItem key={y} value={String(y)} className="text-xs font-bold">{y}</SelectItem>)}</SelectContent>
 </Select>
 </div>
)}
 {period ==="yearly"&& (
 <div className="flex items-center gap-2">
 <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
 <SelectTrigger className="w-28 bg-white/10 border-white/20 text-white font-bold text-xs h-9 rounded-xl"><SelectValue /></SelectTrigger>
 <SelectContent>{[2025, 2026, 2027].map((y) =><SelectItem key={y} value={String(y)} className="text-xs font-bold">سنة {y}</SelectItem>)}</SelectContent>
 </Select>
 </div>
)}
 </div>
 </CardContent>
 </Card>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="rounded-3xl border-0 shadow-md bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-4">
 <div className="flex justify-between items-start">
 <div>
 <div className="text-xs font-bold text-emerald-100"> إجمالي القطع المباعة (Volume)</div>
 <div className="text-3xl font-black mt-1">{loading ?"...": totalQty.toLocaleString()} <span className="text-sm font-normal">قطعة</span></div>
 </div>
 <div className="p-2.5 rounded-2xl bg-white/10"><Package className="w-6 h-6 text-emerald-200"/></div>
 </div>
 <div className="text-[11px] text-emerald-100 mt-2">عبر {stats.filter(s => s.qtySold > 0).length} صنف نشط في الكتالوج</div>
 </Card>
 <Card className="rounded-3xl border-0 shadow-md bg-gradient-to-br from-blue-600 to-indigo-900 text-white p-4">
 <div className="flex justify-between items-start">
 <div>
 <div className="text-xs font-bold text-blue-100"> إيرادات مبيعات الأصناف (GMV)</div>
 <div className="text-3xl font-black mt-1">{loading ?"...": fmtMoney(totalGMV)}</div>
 </div>
 <div className="p-2.5 rounded-2xl bg-white/10"><DollarSign className="w-6 h-6 text-blue-200"/></div>
 </div>
 <div className="text-[11px] text-blue-100 mt-2">متوسط سعر القطعة: {totalQty ? fmtMoney(totalGMV / totalQty) :"0 ج"}</div>
 </Card>
 <Card className="rounded-3xl border shadow-sm bg-card p-4">
 <div className="flex justify-between items-start">
 <div>
 <div className="text-xs font-bold text-muted-foreground"> الصنف الأكثر مبيعاً (كمية)</div>
 <div className="text-lg font-black text-slate-900 mt-1 truncate max-w-[160px]">{topVolumeItem ? topVolumeItem.name :"—"}</div>
 </div>
 <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Award className="w-5 h-5"/></div>
 </div>
 <div className="text-xs font-black text-emerald-600 mt-2">{topVolumeItem ?`${topVolumeItem.qtySold} قطعة (${fmtMoney(topVolumeItem.totalGMV)})`:"0 قطعة"}</div>
 </Card>
 <Card className="rounded-3xl border shadow-sm bg-card p-4">
 <div className="flex justify-between items-start">
 <div>
 <div className="text-xs font-bold text-muted-foreground"> الصنف الأعلى إيراداً (قيمة)</div>
 <div className="text-lg font-black text-slate-900 mt-1 truncate max-w-[160px]">{topRevenueItem ? topRevenueItem.name :"—"}</div>
 </div>
 <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><TrendingUp className="w-5 h-5"/></div>
 </div>
 <div className="text-xs font-black text-purple-700 mt-2">{topRevenueItem ?`${fmtMoney(topRevenueItem.totalGMV)} (${topRevenueItem.revenueSharePct.toFixed(1)}%)`:"0 ج"}</div>
 </Card>
 </div>

 {/* Category Tabs & Search Bar */}
 <Card className="rounded-3xl shadow-sm border">
 <CardHeader className="pb-3">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <CardTitle className="text-base font-black flex items-center gap-2">
 <Filter className="w-5 h-5 text-teal-600"/>
 <span>جدول تحليل حركة مبيعات ونسب مساهمة الأصناف ({filteredStats.length} صنف)</span>
 </CardTitle>
 <div className="relative w-full md:w-72">
 <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <Input className="pr-9 h-9 text-xs font-bold rounded-xl"placeholder="ابحث باسم الصنف (بدلة، قميص، فستان...)"value={search} onChange={(e) => setSearch(e.target.value)} />
 </div>
 </div>

 <div className="pt-3">
 <PosCategoryTabs activeTab={categoryTab} onSelect={setCategoryTab} items={stats} compact={false} activeServiceType={serviceType} onSelectServiceType={setServiceType} />
 </div>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 {loading ? (
 <div className="py-16 text-center space-y-3"><Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600"/><div className="text-xs font-bold text-slate-600">جاري تجميع وحساب حركة الأصناف في الفترة المختارة...</div></div>
) : filteredStats.length === 0 ? (
 <div className="py-16 text-center text-slate-400 font-bold">لا توجد أصناف تطابق فلاتر البحث أو المبوبة المختارة</div>
) : (
 <table className="w-full text-sm">
 <thead className="bg-slate-50 border-y text-slate-600 text-xs font-black">
 <tr>
 <th className="p-3 text-start w-12">#</th>
 <th className="p-3 text-start">اسم الصنف (Service Item)</th>
 <th className="p-3 text-start">المبوبة (Category)</th>
 <th className="p-3 text-start">نوع الخدمة</th>
 <th className="p-3 text-start">سعر الكتالوج</th>
 <th className="p-3 text-center">العدد المباع (Volume)</th>
 <th className="p-3 text-center">عدد الفواتير</th>
 <th className="p-3 text-end">إجمالي الإيراد (GMV)</th>
 <th className="p-3 text-end min-w-[140px]">نسبة المساهمة من المبيعات %</th>
 </tr>
 </thead>
 <tbody className="divide-y">
 {filteredStats.map((s, idx) => (
 <tr key={s.id} className={`hover:bg-slate-50/80 transition ${s.qtySold > 0 ?"bg-white":"bg-slate-50/40 opacity-70"}`}>
 <td className="p-3 font-mono text-xs text-muted-foreground">{idx + 1}</td>
 <td className="p-3 font-black text-slate-900">{s.name}</td>
 <td className="p-3"><Badge className="bg-slate-800 text-white font-mono text-[11px]">{s.category}</Badge></td>
 <td className="p-3"><Badge variant="outline"className="text-xs">{typeLabel(s.service_type)}</Badge></td>
 <td className="p-3 font-mono text-xs">{fmtMoney(s.catalogPrice)}</td>
 <td className="p-3 text-center">
 <Badge className={`text-xs px-2.5 py-0.5 font-mono ${s.qtySold > 0 ?"bg-emerald-600 text-white font-black shadow-2xs":"bg-slate-200 text-slate-600"}`}>
 {s.qtySold.toLocaleString()} قطعة
 </Badge>
 </td>
 <td className="p-3 text-center font-mono text-xs text-slate-600">{s.ordersCount}</td>
 <td className="p-3 text-end font-black font-mono text-teal-800">{fmtMoney(s.totalGMV)}</td>
 <td className="p-3 text-end">
 <div className="flex items-center justify-end gap-2">
 <span className="font-mono text-xs font-bold w-12 text-end">{s.revenueSharePct.toFixed(1)}%</span>
 <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden shrink-0 border">
 <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"style={{ width:`${Math.min(100, s.revenueSharePct)}%`}} />
 </div>
 </div>
 </td>
 </tr>
))}
 </tbody>
 </table>
)}
 </CardContent>
 </Card>
 </div>
);
}
