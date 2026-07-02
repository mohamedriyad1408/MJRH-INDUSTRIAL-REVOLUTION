import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@/hooks/use-server-fn";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { parseLatLng } from "@/lib/geo";
import {
  Plus, Loader2, Building2, LocateFixed, ShieldCheck, Zap, Server,
  TrendingUp, Users, DollarSign, ExternalLink, Activity, CheckCircle2,
  AlertTriangle, RefreshCw, Power, Settings, Eye, Search, Filter,
  Sparkles, Crown, ReceiptText, Banknote, MapPin, Briefcase,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_admin/admin/tenants/")({
  head: () => ({ meta: [{ title: "غرفة عمليات السوبر أدمن — إدارة المشاريع والمغاسل" }] }),
  component: SuperAdminCommandCenter,
});

type Tenant = {
  id: string;
  name: string;
  slug: string;
  business_type?: string | null;
  is_active: boolean;
  owner_user_id: string | null;
  logo_url?: string | null;
  public_url?: string | null;
  brand_color?: string | null;
  operating_radius_km?: number | null;
  created_at: string;
};

type Health = {
  tenant_id: string;
  is_ready: boolean;
  has_settings?: boolean;
  has_branch?: boolean;
  has_cash_account?: boolean;
  has_chart_accounts?: boolean;
  has_employee?: boolean;
  has_catalog?: boolean;
  has_customer_returns_feature?: boolean;
  has_ironing_distribution_feature?: boolean;
};

function businessTypeAr(t: string | null, i18n: any) {
  const key = t || "laundry";
  return ({
    laundry: i18n("biz.laundry", "مغسلة ذكية"),
    retail: i18n("biz.retail", "نشاط تجاري"),
    manufacturing: i18n("biz.manufacturing", "تصنيع وصناعة"),
    services: i18n("biz.services", "خدمات عامة"),
  } as Record<string, string>)[key] || key;
}

function SuperAdminCommandCenter() {
  const { t, dir } = useI18n();
  const { isSuperAdmin } = useAuth();
  const [list, setList] = useState<Tenant[]>([]);
  const [health, setHealth] = useState<Record<string, Health>>({});
  const [empCount, setEmpCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [repairingId, setRepairingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [tenantsRes, healthRes, empRes] = await Promise.all([
        supabase.from("tenants").select("*").order("created_at", { ascending: false }),
        supabase.from("tenant_bootstrap_health").select("*").then((r: any) => r).catch(() => ({ data: [] })),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      setList((tenantsRes.data ?? []) as Tenant[]);
      setHealth(Object.fromEntries(((healthRes.data ?? []) as Health[]).map((h) => [h.tenant_id, h])));
      setEmpCount(empRes.count ?? 0);
    } catch (err: any) {
      toast.error(err?.message || "فشل تحميل بيانات المنصة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredTenants = useMemo(() => {
    let res = list;
    if (filterType !== "all") res = res.filter((tn) => (tn.business_type || "laundry") === filterType);
    if (filterStatus === "active") res = res.filter((tn) => tn.is_active);
    if (filterStatus === "suspended") res = res.filter((tn) => !tn.is_active);
    if (filterStatus === "not_ready") res = res.filter((tn) => !health[tn.id]?.is_ready);

    if (search.trim()) {
      const s = search.toLowerCase();
      res = res.filter((tn) => tn.name.toLowerCase().includes(s) || tn.slug.toLowerCase().includes(s));
    }
    return res;
  }, [list, filterType, filterStatus, search, health]);

  const activeCount = useMemo(() => list.filter((tn) => tn.is_active).length, [list]);
  const readyCount = useMemo(() => list.filter((tn) => health[tn.id]?.is_ready).length, [list]);
  const estimatedArr = useMemo(() => activeCount * 1500, [activeCount]); // Estimated 1500 EGP MRR per active tenant

  if (!isSuperAdmin) {
    return <Card className="p-12 text-center text-red-600 font-black">صلاحية مدير المنصة (Super Admin) فقط.</Card>;
  }

  async function toggleStatus(tenant: Tenant) {
    const nextStatus = !tenant.is_active;
    const actionName = nextStatus ? "تفعيل" : "إيقاف";
    if (!confirm(`هل أنت متأكد من ${actionName} مشروع (${tenant.name})؟`)) return;

    try {
      const { error } = await supabase.from("tenants").update({ is_active: nextStatus }).eq("id", tenant.id);
      if (error) throw error;
      toast.success(`تم ${actionName} المغسلة / المشروع بنجاح`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "فشل تغيير الحالة");
    }
  }

  async function repairTenant(tenant: Tenant) {
    setRepairingId(tenant.id);
    try {
      await supabase.rpc("seed_tenant_defaults", { _tenant_id: tenant.id, _tenant_name: tenant.name });
      await supabase.rpc("ensure_default_branch_for", { _tenant_id: tenant.id, _tenant_name: tenant.name });
      await supabase.rpc("ensure_default_cash_account_for", { _tenant_id: tenant.id });
      await supabase.rpc("ensure_default_chart_accounts_for", { _tenant_id: tenant.id });
      toast.success(`تم فحص وإعادة تجهيز نواة التشغيل لمشروع (${tenant.name}) بنجاح`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "فشل الصيانة البرمجية");
    } finally {
      setRepairingId(null);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24" dir={dir}>
      {/* Executive Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-teal-300 text-xs font-mono font-black shadow-xs">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>SUPER ADMIN COMMAND CENTER</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>خوادم وقواعد بيانات Supabase: 100% Uptime</span>
            </div>
          </div>

          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Server className="w-8 h-8 md:w-9 md:h-9 text-teal-600 shrink-0" />
            <span>غرفة عمليات إدارة المشاريع والمغاسل</span>
          </h1>
          <p className="text-sm text-slate-600 font-semibold max-w-3xl leading-relaxed">
            التحكم المركزي في شبكة المشاريع والمغاسل السحابية النشطة، إدارة التراخيص والاشتراكات، ومراقبة جاهزية التشغيل والـ APDO على مستوى المنظومة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild variant="outline" className="font-bold border-slate-300 hover:bg-slate-100 h-11">
            <Link to="/admin/billing">
              <ReceiptText className="w-4 h-4 ms-1.5 text-indigo-600" />
              <span>فواتير SaaS</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="font-bold border-slate-300 hover:bg-slate-100 h-11">
            <Link to="/admin/platform-fees">
              <Banknote className="w-4 h-4 ms-1.5 text-emerald-600" />
              <span>رسوم المنصة</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="font-bold border-slate-300 hover:bg-slate-100 h-11">
            <Link to="/admin/users">
              <Users className="w-4 h-4 ms-1.5 text-blue-600" />
              <span>كل المستخدمين</span>
            </Link>
          </Button>

          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-black shadow-lg rounded-2xl h-11 px-6">
                <Plus className="w-5 h-5 ms-1.5" />
                <span>تأسيس مشروع / مغسلة جديدة</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl rounded-3xl" dir={dir}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-teal-600" />
                  <span>تأسيس مشروع سحابي جديد وتوليد حساب المالك</span>
                </DialogTitle>
              </DialogHeader>
              <NewTenantForm onDone={() => { setOpenNew(false); loadData(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 4 Executive KPI Intelligence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-gradient-to-br from-white to-slate-50 overflow-hidden relative">
          <div className="absolute top-0 end-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">إجمالي المشاريع والمغاسل</p>
              <p className="text-3xl font-black font-mono text-slate-900">{list.length}</p>
              <div className="text-[11px] font-bold text-teal-700 flex items-center gap-1">
                <span>{activeCount} مفعلة</span> • <span className="text-red-600">{list.length - activeCount} موقوفة</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-emerald-50/40 overflow-hidden relative">
          <div className="absolute top-0 end-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-800">جاهزية التشغيل والـ APDO</p>
              <p className="text-3xl font-black font-mono text-emerald-700">{readyCount} / {list.length}</p>
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 inline" />
                <span>مكتمل التجهيز والنواة</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-indigo-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-indigo-50/40 overflow-hidden relative">
          <div className="absolute top-0 end-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-indigo-800">إيرادات الـ SaaS الشهرية (MRR)</p>
              <p className="text-2xl font-black font-mono text-indigo-900">{estimatedArr.toLocaleString()} ج.م</p>
              <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 inline" />
                <span>عائد اشتراكات المشاريع المفعلة</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 shadow-inner">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-blue-50/40 overflow-hidden relative">
          <div className="absolute top-0 end-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-blue-800">قوى العمل بالشبكة (Workforce)</p>
              <p className="text-3xl font-black font-mono text-blue-700">{empCount}</p>
              <div className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 inline" />
                <span>موظف نشط في جميع المغاسل</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 shadow-inner">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border border-slate-200 shadow-xs rounded-3xl bg-slate-50/70 overflow-hidden">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">النوع:</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 rounded-xl bg-white h-10 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنشطة</SelectItem>
                  <SelectItem value="laundry">مغسلة ذكية (Laundry)</SelectItem>
                  <SelectItem value="retail">نشاط تجاري (Retail)</SelectItem>
                  <SelectItem value="manufacturing">تصنيع (Manufacturing)</SelectItem>
                  <SelectItem value="services">خدمات (Services)</SelectItem>
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
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="active">مفعلة (Active)</SelectItem>
                  <SelectItem value="suspended">موقوفة (Suspended)</SelectItem>
                  <SelectItem value="not_ready">ناقصة إعداد (Not Ready)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المغسلة أو الكود (slug)..."
              className="h-10 pe-10 rounded-2xl bg-white font-bold text-xs shadow-2xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Modern Interactive Tenant Capsules Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto" />
          <div className="font-extrabold text-slate-700 text-base">جاري تحميل وتحليل شبكة المغاسل والمشاريع السحابية...</div>
        </div>
      ) : filteredTenants.length === 0 ? (
        <Card className="p-16 text-center border-dashed rounded-3xl text-slate-400 font-bold space-y-3">
          <Building2 className="w-16 h-16 mx-auto text-slate-300" />
          <p className="text-lg text-slate-700">لا توجد مشاريع أو مغاسل مطابقة لمعايير البحث والفلترة الحالية</p>
          <Button variant="outline" onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }} className="font-bold">
            إعادة ضبط الفلاتر
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTenants.map((tn) => {
            const h = health[tn.id];
            const isReady = h?.is_ready ?? false;
            const color = tn.brand_color || "#0d9488";
            return (
              <Card
                key={tn.id}
                className={`border-2 transition-all duration-300 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl bg-white flex flex-col justify-between ${
                  !tn.is_active ? "border-red-300 bg-red-50/20 opacity-90" : isReady ? "border-slate-200/90 hover:border-teal-400" : "border-amber-300 bg-amber-50/20"
                }`}
              >
                <div>
                  {/* Top Brand Banner & Statuses */}
                  <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, #0f172a)` }}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 overflow-hidden shadow-md">
                        {tn.logo_url ? <img src={tn.logo_url} className="w-full h-full object-cover" /> : <Building2 className="w-7 h-7" />}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-xl text-white truncate">{tn.name}</h3>
                          <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 font-mono font-black text-xs">
                            @{tn.slug}
                          </Badge>
                        </div>
                        <div className="text-xs text-white/80 font-medium flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>{businessTypeAr(tn.business_type ?? "laundry", t)}</span>
                          {tn.operating_radius_km && <span>• نطاق التشغيل: {tn.operating_radius_km} كم</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge className={`text-xs font-black px-3 py-1 shadow-sm ${tn.is_active ? "bg-emerald-500 text-white" : "bg-red-600 text-white animate-pulse"}`}>
                        {tn.is_active ? "مفعلة تشغيلياً" : "موقوفة من الإدارة"}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] font-mono bg-slate-950/60 border-white/20 text-white`}>
                        ID: {tn.id.slice(0, 8)}
                      </Badge>
                    </div>
                  </div>

                  {/* APDO & Core Readiness Breakdown */}
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-slate-700 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-teal-600" />
                          <span>حالة نواة التشغيل والـ APDO:</span>
                        </span>
                        <span className={isReady ? "text-emerald-700" : "text-amber-700"}>
                          {isReady ? "🟢 نواة تشغيل مكتملة 100%" : "⚠️ نواة غير مكتملة الإعداد"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <Badge variant="outline" className={`text-[11px] font-bold ${h?.has_settings ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-700"}`}>
                          {h?.has_settings ? "✓ الإعدادات" : "✗ الإعدادات"}
                        </Badge>
                        <Badge variant="outline" className={`text-[11px] font-bold ${h?.has_branch ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-700"}`}>
                          {h?.has_branch ? "✓ فروع" : "✗ فروع"}
                        </Badge>
                        <Badge variant="outline" className={`text-[11px] font-bold ${h?.has_cash_account ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-700"}`}>
                          {h?.has_cash_account ? "✓ خزنة" : "✗ خزنة"}
                        </Badge>
                        <Badge variant="outline" className={`text-[11px] font-bold ${h?.has_chart_accounts ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-700"}`}>
                          {h?.has_chart_accounts ? "✓ شجرة حسابات" : "✗ شجرة حسابات"}
                        </Badge>
                        <Badge variant="outline" className={`text-[11px] font-bold ${h?.has_catalog ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-700"}`}>
                          {h?.has_catalog ? "✓ كتالوج خدمات" : "✗ كتالوج خدمات"}
                        </Badge>
                        <Badge variant="outline" className={`text-[11px] font-bold ${h?.has_employee ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-700"}`}>
                          {h?.has_employee ? "✓ حساب المالك" : "✗ حساب المالك"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Deep Super Admin Action Toolbar */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs">
                      <Link to=".." params={{ tenant: tn.slug } as any}>
                        <Eye className="w-3.5 h-3.5 ms-1 text-teal-400" />
                        <span>دخول لوحة التشغيل</span>
                      </Link>
                    </Button>

                    <Button asChild size="sm" variant="outline" className="font-bold rounded-xl bg-white border-slate-300">
                      <a href={`/${tn.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 ms-1" />
                        <span>بوابة المغسلة</span>
                      </a>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 ms-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => repairTenant(tn)}
                      disabled={repairingId === tn.id}
                      className="font-bold text-indigo-700 hover:bg-indigo-50 border-indigo-200 rounded-xl"
                      title="إعادة تجهيز شجرة الحسابات والخزنة والفرع الافتراضي في حال نقص أي منها"
                    >
                      {repairingId === tn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin ms-1" /> : <RefreshCw className="w-3.5 h-3.5 ms-1" />}
                      <span>صيانة النواة</span>
                    </Button>

                    <Button
                      size="sm"
                      variant={tn.is_active ? "outline" : "default"}
                      onClick={() => toggleStatus(tn)}
                      className={`font-black rounded-xl ${tn.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                    >
                      <Power className="w-3.5 h-3.5 ms-1" />
                      <span>{tn.is_active ? "إيقاف المشروع" : "تفعيل المشروع"}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Helpful Admin Link Footer */}
      <Card className="p-6 rounded-3xl bg-slate-900 text-white border-0 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-teal-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-base text-white">إدارة صلاحيات ومستخدمي شبكة المشاريع</h4>
            <p className="text-xs text-slate-300">لتعيين أدوار جديدة، تعديل كلمات المرور، أو تعليق وصول الموظفين في أي مغسلة.</p>
          </div>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl h-11 px-6">
          <Link to="/admin/users">الانتقال لصفحة إدارة كل المستخدمين &larr;</Link>
        </Button>
      </Card>
    </div>
  );
}

function NewTenantForm({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(adminApi.createTenant);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessType, setBusinessType] = useState("laundry");
  const [locationUrl, setLocationUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("8");
  const [loading, setLoading] = useState(false);

  function extractLocation() {
    const parsed = parseLatLng(locationUrl);
    if (!parsed) return toast.error("الصق رابط Google Maps أو إحداثيات lat,lng بشكل صحيح");
    setLat(String(parsed.lat));
    setLng(String(parsed.lng));
    toast.success("تم استخراج الإحداثيات بنجاح");
  }

  function useGps() {
    if (!navigator.geolocation) return toast.error("المتصفح لا يدعم تحديد الموقع GPS");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(7));
        setLng(p.coords.longitude.toFixed(7));
        setLocationUrl(`https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`);
        toast.success("تم التقاط إحداثيات موقعك الحالي بدقة");
      },
      () => toast.error("تعذر تحديد الموقع الجغرافي"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fn({
        name,
        slug,
        businessType,
        logoUrl: logoUrl || null,
        publicUrl: publicUrl || null,
        ownerEmail: email,
        ownerPassword: password,
        ownerFullName: fullName,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        locationUrl: locationUrl || null,
        operatingRadiusKm: Number(radius || 8),
      });
      toast.success("تم تأسيس المشروع السحابي وإنشاء حساب المالك بنجاح");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ أثناء إنشاء المغسلة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 pt-2">
      {/* Section 1: Project Identity & Type */}
      <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b pb-2">
          <Building2 className="w-4 h-4 text-teal-600" />
          <span>القسم الأول: الهوية ونوع النشاط التشغيلي</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">اسم المشروع / المغسلة *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="مثال: مغسلة التميز الذكية" className="bg-white rounded-xl font-bold" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">نوع النشاط في المنظومة *</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger className="bg-white rounded-xl font-bold text-xs h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="laundry" className="font-bold">مغسلة ذكية / Laundry</SelectItem>
                <SelectItem value="retail" className="font-bold">نشاط تجاري / Retail</SelectItem>
                <SelectItem value="manufacturing" className="font-bold">صناعي / Manufacturing</SelectItem>
                <SelectItem value="services" className="font-bold">خدمات / Services</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">كود المسار في الرابط (Slug) *</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required pattern="[a-z0-9\-]+" placeholder="dry-tech" className="bg-white rounded-xl font-mono font-black text-teal-800" />
            <p className="text-[10px] text-slate-500 mt-1 font-mono">سيكون الرابط: mjrh.vercel.app/{slug || "slug"}</p>
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">رابط الشعار (Logo URL)</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="bg-white rounded-xl font-mono text-xs" />
          </div>
        </div>
      </div>

      {/* Section 2: Owner Credentials */}
      <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200">
        <h4 className="font-black text-sm text-indigo-950 flex items-center gap-2 border-b border-indigo-200/60 pb-2">
          <Crown className="w-4 h-4 text-indigo-600" />
          <span>القسم الثاني: حساب المالك الإداري (Owner User)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">الاسم الكامل للمالك *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="المهندس محمد الرياض" className="bg-white rounded-xl font-bold" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">البريد الإلكتروني للمالك *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="owner@project.com" className="bg-white rounded-xl font-mono font-bold" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">كلمة المرور *</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} className="bg-white rounded-xl font-mono font-black" />
          </div>
        </div>
        <p className="text-[11px] text-indigo-800 font-semibold">💡 تنبيه: تجنب وضع إيميل السوبر أدمن هنا ليحتفظ المشروع بمالك مستقل برمجياً.</p>
      </div>

      {/* Section 3: Geofencing & Location */}
      <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <h4 className="font-black text-sm text-slate-900 flex items-center justify-between border-b pb-2">
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>القسم الثالث: الموقع ونطاق التوصيل الجغرافي (Geofence)</span>
          </span>
          <Button type="button" size="sm" variant="outline" onClick={useGps} className="h-7 text-xs font-bold bg-white text-emerald-700 border-emerald-300">
            <LocateFixed className="w-3 h-3 ms-1" /> تحديد موقعي الآن
          </Button>
        </h4>
        <div className="flex gap-2">
          <Input placeholder="رابط Google Maps أو إحداثيات lat,lng" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} className="bg-white rounded-xl font-mono text-xs flex-1" />
          <Button type="button" variant="secondary" onClick={extractLocation} className="font-bold rounded-xl shrink-0">
            استخراج من الرابط
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">Latitude</Label>
            <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="30.0444" className="bg-white rounded-xl font-mono text-xs font-bold" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">Longitude</Label>
            <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="31.2357" className="bg-white rounded-xl font-mono text-xs font-bold" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">نطاق التوصيل (كم)</Label>
            <Input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="8" className="bg-white rounded-xl font-mono font-bold" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading} className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-black rounded-2xl h-12 px-8 shadow-lg">
          {loading ? <Loader2 className="w-5 h-5 animate-spin ms-2" /> : <Plus className="w-5 h-5 ms-2" />}
          <span>تأسيس المشروع وتوليد الحسابات الآن</span>
        </Button>
      </div>
    </form>
  );
}
