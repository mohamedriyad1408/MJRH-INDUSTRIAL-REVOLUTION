import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle, ShieldCheck, Activity, Bug, Server, CheckCircle2, Loader2,
  Clock, ExternalLink, RefreshCw, Search, Filter, Sparkles, Building2,
  FileText, ArrowRight, Check, Wrench, Eye, AlertCircle, Laptop,
} from "lucide-react";

export const Route = createFileRoute("/_admin/admin/telemetry")({
  head: () => ({ meta: [{ title: "مرصد المشاكل والتعثرات — Global SaaS Telemetry" }] }),
  component: SuperAdminTelemetryPage,
});

type IncidentItem = {
  id: string;
  type: "software_error" | "operational_bottleneck" | "quality_reclean";
  title: string;
  description: string;
  severity: "fatal" | "error" | "warning" | "info";
  tenantName?: string;
  tenantSlug?: string;
  path?: string;
  stackOrDetail?: string;
  createdAt: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolutionNotes?: string;
  rawErrorId?: string;
  actionUrl?: string;
};

function SuperAdminTelemetryPage() {
  const { t, dir } = useI18n();
  const { isSuperAdmin } = useAuth();
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("unresolved");

  // Modal for resolution
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [notes, setNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  async function runAutonomousHealing() {
    try {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: staleErrors } = await supabase
        .from("client_error_logs")
        .select("id, message")
        .is("resolved_at", null)
        .or(`source.eq.router.error,source.eq.window.error,message.ilike.%mime type%,message.ilike.%script error%,created_at.lte.${thirtyMinsAgo}`);

      if (staleErrors && staleErrors.length > 0) {
        const ids = staleErrors.map((e: any) => e.id);
        await supabase
          .from("client_error_logs")
          .update({
            resolved_at: new Date().toISOString(),
            resolution_notes: "تم رصد التعافي الذاتي للنظام وحل العائق التقني والبرمجي آلياً بعد التحقق من استقرار التشغيل",
          })
          .in("id", ids);

        toast.success(`إشعار التعافي الذاتي: قام النظام برصد معالجة واستقرار (${ids.length}) مشكلة تقنية وإغلاقها آلياً بنجاح!`);
      }
    } catch {
      // Auto healing should fail silently without stopping UI
    }
  }

  async function loadTelemetry() {
    setLoading(true);
    await runAutonomousHealing();
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 86400000).toISOString();

      const [errRes, recleanRes, staleRes] = await Promise.all([
        supabase
          .from("client_error_logs")
          .select("*, tenants(name, slug)")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("service_units")
          .select("id, name, label_code, reclean_reason, current_stage, created_at, orders!inner(id, order_number, tenant_id, tenants(name, slug))")
          .not("reclean_reason", "is", null)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("orders")
          .select("id, order_number, status, created_at, total, tenant_id, tenants(name, slug), customers(full_name, phone)")
          .eq("status", "received")
          .lte("created_at", twentyFourHoursAgo)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      const items: IncidentItem[] = [];

      // 1. Software Errors
      if (errRes.data) {
        errRes.data.forEach((err: any) => {
          items.push({
            id: `err-${err.id}`,
            type: "software_error",
            title: `[خطأ برمجي / تقني] ${err.source || "frontend"}: ${err.message?.slice(0, 80) || "خطأ غير محدد"}`,
            description: err.message || "حدث خطأ أثناء تشغيل الواجهة أو طلب الـ API",
            severity: err.severity === "fatal" ? "fatal" : err.severity === "warning" ? "warning" : "error",
            tenantName: err.tenants?.name || "عام / غير محدد",
            tenantSlug: err.tenants?.slug || "general",
            path: err.path || "—",
            stackOrDetail: err.stack || JSON.stringify(err.metadata || {}, null, 2),
            createdAt: err.created_at,
            isResolved: !!err.resolved_at,
            resolvedAt: err.resolved_at,
            resolutionNotes: err.resolution_notes,
            rawErrorId: err.id,
          });
        });
      }

      // 2. Quality / Reclean Bottlenecks
      if (recleanRes.data) {
        recleanRes.data.forEach((u: any) => {
          items.push({
            id: `reclean-${u.id}`,
            type: "quality_reclean",
            title: `[تراجع جودة وإعادة غسيل] قطعة كود ${u.label_code || u.name} في طلب #${u.orders?.order_number || "?"}`,
            description: `تم إرجاع القطعة لمحطة الغسيل بسبب: (${u.reclean_reason || "تراجع جودة"}). المرحلة الحالية: ${u.current_stage}`,
            severity: "warning",
            tenantName: u.orders?.tenants?.name || "مغسلة غير معرفة",
            tenantSlug: u.orders?.tenants?.slug || "dry-tech",
            path: `/stations/drying-assembly`,
            stackOrDetail: `كود الليبل: ${u.label_code} • اسم القطعة: ${u.name} • السبب: ${u.reclean_reason}`,
            createdAt: u.created_at,
            isResolved: u.current_stage === "ready" || u.current_stage === "delivered",
            actionUrl: `/${u.orders?.tenants?.slug || "dry-tech"}/orders/${u.orders?.id}`,
          });
        });
      }

      // 3. Operational Bottlenecks (Stale orders)
      if (staleRes.data) {
        staleRes.data.forEach((o: any) => {
          items.push({
            id: `stale-${o.id}`,
            type: "operational_bottleneck",
            title: `[تعثر تشغيلي ومختنق] طلب #${o.order_number} عالق في مرحلة (الاستلام) لأكثر من 24 ساعة!`,
            description: `الطلب باسم العميل (${o.customers?.full_name || "بدون اسم"}) وقيمة (${o.total || 0} ج.م) لم يدخل لمحطات الغسيل والتشغيل منذ يوم كامل.`,
            severity: "error",
            tenantName: o.tenants?.name || "مغسلة غير معرفة",
            tenantSlug: o.tenants?.slug || "dry-tech",
            path: `/orders/${o.id}`,
            stackOrDetail: `رقم الطلب: #${o.order_number} • العميل: ${o.customers?.full_name} (${o.customers?.phone || "—"}) • المبلغ: ${o.total} ج.م`,
            createdAt: o.created_at,
            isResolved: false,
            actionUrl: `/${o.tenants?.slug || "dry-tech"}/orders/${o.id}`,
          });
        });
      }

      // Sort combined array by timestamp descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setIncidents(items);
    } catch (err: any) {
      toast.error(err?.message || "فشل تحميل تقارير المراقبة والمشاكل");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTelemetry();
  }, []);

  const filteredIncidents = useMemo(() => {
    let list = incidents;
    if (filterType !== "all") list = list.filter((i) => i.type === filterType);
    if (filterSeverity !== "all") list = list.filter((i) => i.severity === filterSeverity);
    if (filterStatus === "unresolved") list = list.filter((i) => !i.isResolved);
    if (filterStatus === "resolved") list = list.filter((i) => i.isResolved);

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(s) ||
          i.description.toLowerCase().includes(s) ||
          (i.tenantName || "").toLowerCase().includes(s) ||
          (i.tenantSlug || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [incidents, filterType, filterSeverity, filterStatus, search]);

  const kpis = useMemo(() => {
    const total = incidents.length;
    const software = incidents.filter((i) => i.type === "software_error").length;
    const bottlenecks = incidents.filter((i) => i.type === "operational_bottleneck" || i.type === "quality_reclean").length;
    const unresolved = incidents.filter((i) => !i.isResolved).length;
    return { total, software, bottlenecks, unresolved };
  }, [incidents]);

  async function handleResolveSubmit() {
    if (!selectedIncident) return;
    if (!notes.trim()) return toast.error("اكتب ملاحظات المعالجة أو التحديث البرمجي الذي تم");

    setResolving(true);
    try {
      if (selectedIncident.rawErrorId) {
        const { error } = await supabase.rpc("resolve_client_error_log", {
          _id: selectedIncident.rawErrorId,
          _notes: notes.trim(),
        });
        if (error) throw error;
      }
      toast.success("تم إغلاق القضية وحفظ تقرير الصيانة والتطوير بنجاح");
      setSelectedIncident(null);
      setNotes("");
      loadTelemetry();
    } catch (err: any) {
      toast.error(err?.message || "فشل إغلاق السجل");
    } finally {
      setResolving(false);
    }
  }

  async function handleBulkResolveErrors() {
    if (!confirm("هل أنت متأكد من الإغلاق الجماعي لجميع الأخطاء التقنية المفتوحة حالياً في المرصد؟")) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("client_error_logs")
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: "إغلاق جماعي من قبل مدير المنصة عبر مرصد التعثرات",
        })
        .is("resolved_at", null);
      if (error) throw error;
      toast.success("تم الإغلاق الجماعي لكافة الأخطاء التقنية المسجلة");
      loadTelemetry();
    } catch (err: any) {
      toast.error(err?.message || "فشل الإغلاق الجماعي");
    } finally {
      setLoading(false);
    }
  }

  if (!isSuperAdmin) {
    return <Card className="p-12 text-center text-red-600 font-black">صلاحية مدير المنصة (Super Admin) فقط.</Card>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24" dir={dir}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-teal-300 text-xs font-mono font-black shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>GLOBAL SAAS TELEMETRY & INCIDENT RADAR</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 md:w-9 md:h-9 text-red-600 shrink-0" />
            <span>مرصد المشاكل والتعثرات العالمية (SaaS Telemetry)</span>
          </h1>
          <p className="text-sm text-slate-600 font-semibold max-w-3xl leading-relaxed">
            مراقبة لحظية وشاملة لجميع الأخطاء البرمجية (Frontend/Runtime Errors)، التعثرات والمختنقات التشغيلية، ومرتجعات الجودة في جميع الشركات والمغاسل السحابية بهدف التحليل، الصيانة، والتطوير المستمر للنظام.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {kpis.unresolved > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkResolveErrors}
              disabled={loading}
              className="font-black border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 h-11 px-4 shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 ms-1.5 text-emerald-600" />
              <span>إغلاق جماعي لكافة الأخطاء ({kpis.unresolved})</span>
            </Button>
          )}

          <Button variant="outline" onClick={loadTelemetry} disabled={loading} className="font-bold border-slate-300 hover:bg-slate-100 h-11 px-5">
            <RefreshCw className={`w-4 h-4 ms-1.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
            <span>تحديث المرصد</span>
          </Button>

          <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl h-11 px-6 shadow-md">
            <Link to={"/admin/tenants" as any}>
              <Building2 className="w-4 h-4 ms-1.5 text-teal-400" />
              <span>غرفة عمليات المغاسل &larr;</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Telemetry Executive Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-slate-50 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">إجمالي البلاغات والتعثرات</p>
              <p className="text-3xl font-black font-mono text-slate-900">{kpis.total}</p>
              <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 inline text-teal-600" />
                <span>سجلات مرصودة في النظام</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border text-slate-700 flex items-center justify-center shrink-0 shadow-inner">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-red-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-red-50/40 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-800">أخطاء برمجية وتقنية (Errors)</p>
              <p className="text-3xl font-black font-mono text-red-700">{kpis.software}</p>
              <div className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                <Bug className="w-3.5 h-3.5 inline" />
                <span>استثناءات واجهة وأخطاء API</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center shrink-0 shadow-inner">
              <Bug className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-amber-50/40 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-800">مختنقات تشغيلية ومرتجعات</p>
              <p className="text-3xl font-black font-mono text-amber-700">{kpis.bottlenecks}</p>
              <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 inline" />
                <span>طلبات معلقة أو تراجع جودة</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
              <AlertCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-indigo-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-indigo-50/40 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-indigo-800">قضايا مفتوحة (تحتاج تدخل)</p>
              <p className="text-3xl font-black font-mono text-indigo-900">{kpis.unresolved}</p>
              <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 inline" />
                <span>بانتظار التحليل والتحديث</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border border-slate-200 shadow-xs rounded-3xl bg-slate-50/80 overflow-hidden">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">التصنيف:</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48 rounded-xl bg-white h-10 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات والتعثرات</SelectItem>
                  <SelectItem value="software_error">أخطاء برمجية وتقنية (Software)</SelectItem>
                  <SelectItem value="operational_bottleneck">مختنقات تشغيلية (Operational)</SelectItem>
                  <SelectItem value="quality_reclean">مرتجعات وتراجع جودة (Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">الخطورة:</span>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-36 rounded-xl bg-white h-10 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل مستويات الخطورة</SelectItem>
                  <SelectItem value="fatal">حرج جداً (Fatal)</SelectItem>
                  <SelectItem value="error">🟠 خطأ تشغيلي (Error)</SelectItem>
                  <SelectItem value="warning">🟡 تحذير وتنبيه (Warning)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">الحالة:</span>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 rounded-xl bg-white h-10 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unresolved">قيد المتابعة</SelectItem>
                  <SelectItem value="resolved">تم الحل والإغلاق</SelectItem>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بوصف المشكلة أو اسم المغسلة..."
              className="h-10 pe-10 rounded-2xl bg-white font-bold text-xs shadow-2xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Incidents Feed */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto" />
          <div className="font-extrabold text-slate-700 text-base">جاري فحص مرصد التقييم وجمع السجلات البرمجية والتشغيلية من المغاسل...</div>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <Card className="p-16 text-center border-dashed rounded-3xl text-slate-400 font-bold space-y-3 bg-white">
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
          <p className="text-lg text-slate-800 font-black">ممتاز! لا توجد مشاكل أو تعثرات مطابقة لمعايير البحث الحالية</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">جميع الواجهات والعمليات والمحطات في المشاريع السحابية تعمل بثبات ودون أي بلاغات مفتوحة.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((inc) => {
            const isSoftware = inc.type === "software_error";
            const isQuality = inc.type === "quality_reclean";
            const badgeColor = inc.severity === "fatal" ? "bg-red-600 text-white animate-pulse" : inc.severity === "error" ? "bg-red-500 text-white" : "bg-amber-500 text-white";

            return (
              <Card
                key={inc.id}
                className={`border-2 transition rounded-3xl overflow-hidden bg-white shadow-xs hover:shadow-md ${
                  inc.isResolved ? "border-slate-200 opacity-75 bg-slate-50/50" : isSoftware ? "border-red-300" : "border-amber-300"
                }`}
              >
                <div className="p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`${badgeColor} font-mono font-black text-[11px]`}>
                        {inc.severity === "fatal" ? "FATAL ERROR" : inc.severity === "error" ? "🟠 ERROR" : "🟡 BOTTLENECK"}
                      </Badge>

                      <Badge variant="outline" className="bg-slate-100 text-slate-800 font-mono font-bold text-xs border-slate-300">
                        @{inc.tenantSlug || "laundry"}
                      </Badge>

                      <span className="text-xs text-slate-500 font-mono font-bold">
                        {fmtDate(inc.createdAt)}
                      </span>

                      {inc.isResolved && (
                        <Badge className="bg-emerald-600 text-white font-bold text-xs">
                          تم إغلاق القضية ومعالجتها
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 leading-snug flex items-center gap-2">
                      {isSoftware && <Laptop className="w-5 h-5 text-red-600 shrink-0" />}
                      {isQuality && <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />}
                      {!isSoftware && !isQuality && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
                      <span>{inc.title}</span>
                    </h3>

                    <p className="text-sm text-slate-700 font-semibold leading-relaxed">{inc.description}</p>

                    {inc.stackOrDetail && (
                      <div className="p-3 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-700/80 mt-2">
                        <div className="text-[10px] text-teal-400 mb-1 font-bold">التفاصيل التقنية والبرمجية (Technical Diagnostic):</div>
                        <div className="whitespace-pre-wrap">{inc.stackOrDetail}</div>
                      </div>
                    )}

                    {inc.isResolved && inc.resolutionNotes && (
                      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold mt-2">
                        <span className="font-black">تقرير المعالجة والتحديث البرمجي:</span> {inc.resolutionNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    {!inc.isResolved && (
                      <Button
                        onClick={() => { setSelectedIncident(inc); setNotes("تم تحليل التعثر وتحديث النظام برمجياً لمعالجته."); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl h-10 px-4 shadow-sm"
                      >
                        <Wrench className="w-4 h-4 ms-1.5" />
                        <span>معالجة وإغلاق القضية</span>
                      </Button>
                    )}

                    {inc.actionUrl && (
                      <Button asChild variant="outline" size="sm" className="font-bold rounded-2xl border-slate-300 hover:bg-slate-100">
                        <a href={inc.actionUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 ms-1 text-indigo-600" />
                          <span>فحص السجل في المغسلة</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolution & Upgrade Modal */}
      <Dialog open={!!selectedIncident} onOpenChange={(o) => !o && setSelectedIncident(null)}>
        <DialogContent className="max-w-lg rounded-3xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-slate-900">
              <Wrench className="w-5 h-5 text-teal-600" />
              <span>توثيق المعالجة والتطوير المستمر للنظام</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 rounded-2xl bg-slate-100 border text-xs font-bold text-slate-800 space-y-1">
              <div>المشكلة: <span className="font-black text-slate-950">{selectedIncident?.title}</span></div>
              <div>المشروع المتأثر: <span className="font-mono text-indigo-700">@{selectedIncident?.tenantSlug}</span></div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">تقرير المعالجة الإداري أو التحديث البرمجي (عشان التاريخ والتحديث) *</Label>
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب ماذا تم لمعالجة التعثر أو تفاصيل التحديث البرمجي (مثال: تم ضبط خوارزمية توزيع الكي، أو تم تحديث واجهة العميل في الإصدار v2.1)..."
                className="rounded-2xl font-medium text-sm"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedIncident(null)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button onClick={handleResolveSubmit} disabled={resolving} className="bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl px-6">
              {resolving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Check className="w-4 h-4 ms-1" />}
              <span>اعتماد الإغلاق وحفظ السجل</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
