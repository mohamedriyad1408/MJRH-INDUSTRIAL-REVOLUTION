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
  Plus, Loader2, Building2, LocateFixed, ShieldCheck, Server,
  TrendingUp, Users, DollarSign, ExternalLink, Activity, CheckCircle2,
  AlertTriangle, RefreshCw, Power, Eye, Search, Filter, Crown, ReceiptText, Banknote, MapPin, Briefcase,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/admin/tenants/")({
  head: () => ({ meta: [{ title: "Tenants Admin - MJRH" }] }),
  component: TenantsPage,
});

type Tenant = {
  id: string;
  name: string;
  slug: string;
  business_type?: string | null;
  is_active: boolean;
  owner_user_id: string | null;
  logo_url?: string | null;
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

function TenantsPage() {
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

  useEffect(() => { loadData(); }, []);

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
  const estimatedArr = useMemo(() => activeCount * 1500, [activeCount]);

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
      toast.success(`تم ${actionName} المغسلة بنجاح`);
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
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-teal-300 text-xs font-mono font-black shadow-xs">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>SUPER ADMIN COMMAND CENTER</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Server className="w-8 h-8 md:w-9 md:h-9 text-brand-blue shrink-0" />
            <span>إدارة مشاريع المنظومة</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
           <Button asChild variant="outline" className="font-bold border-slate-300 h-11"><Link to="/admin/billing">فواتير SaaS</Link></Button>
           <Button asChild variant="outline" className="font-bold border-slate-300 h-11"><Link to="/admin/users">المستخدمين</Link></Button>
           <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-brand-blue hover:bg-blue-800 text-white font-black shadow-lg rounded-2xl h-11 px-6">
                <Plus className="w-5 h-5 ms-1.5" />
                <span>تأسيس مشروع جديد</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl rounded-3xl" dir={dir}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-teal-600" />
                  <span>تأسيس مشروع سحابي جديد</span>
                </DialogTitle>
              </DialogHeader>
              <NewTenantForm onDone={() => { setOpenNew(false); loadData(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="إجمالي المشاريع" value={list.length} icon={<Building2 />} sub={`${activeCount} مفعلة`} />
        <Kpi label="جاهزية APDO" value={`${readyCount}/${list.length}`} icon={<ShieldCheck />} sub="مكتمل التجهيز" tone="emerald" />
        <Kpi label="MRR (SaaS)" value={`${estimatedArr.toLocaleString()} ج.م`} icon={<DollarSign />} sub="عائد الاشتراكات" tone="indigo" />
        <Kpi label="إجمالي الموظفين" value={empCount} icon={<Users />} sub="في جميع المشاريع" tone="blue" />
      </div>

      <Card className="border border-slate-200 shadow-xs rounded-3xl bg-slate-50/70 overflow-hidden">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2">
               <Search className="w-4 h-4 text-slate-400" />
               <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المشروع..." className="h-10 rounded-2xl bg-white font-bold text-xs" />
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTenants.map((tn) => {
           const h = health[tn.id];
           const isReady = h?.is_ready ?? false;
           return (
             <Card key={tn.id} className="border-2 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl bg-white flex flex-col justify-between">
                <div>
                  <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4" style={{ background: `linear-gradient(135deg, ${tn.brand_color || '#1E3A8A'}, #0f172a)` }}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 overflow-hidden shadow-md">
                        {tn.logo_url ? <img src={tn.logo_url} className="w-full h-full object-cover" /> : <Building2 className="w-7 h-7" />}
                      </div>
                      <div className="min-w-0 space-y-1">
                         <h3 className="font-black text-xl text-white truncate">{tn.name}</h3>
                         <Badge className="bg-white/20 text-white border-0 font-mono font-black text-xs">@{tn.slug}</Badge>
                      </div>
                    </div>
                    <Badge className={tn.is_active ? "bg-emerald-500" : "bg-red-600 animate-pulse"}>{tn.is_active ? "نشط" : "موقوف"}</Badge>
                  </div>
                  <CardContent className="p-6">
                     <div className="flex items-center justify-between text-xs font-black mb-3">
                        <span className="text-slate-700">حالة جاهزية النواة:</span>
                        <span className={isReady ? "text-emerald-700" : "text-amber-700"}>{isReady ? "🟢 مكتملة" : "🟠 غير مكتملة"}</span>
                     </div>
                     <div className="flex flex-wrap gap-1.5">
                        <HealthBadge label="خزنة" ok={h?.has_cash_account} />
                        <HealthBadge label="حسابات" ok={h?.has_chart_accounts} />
                        <HealthBadge label="موظف" ok={h?.has_employee} />
                        <HealthBadge label="كتالوج" ok={h?.has_catalog} />
                     </div>
                  </CardContent>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                   <Button asChild size="sm" className="bg-slate-900 text-white font-bold rounded-xl"><Link to={`/${tn.slug}/dashboard` as any}>دخول</Link></Button>
                   <div className="flex gap-2">
                     <Button size="sm" variant="outline" onClick={() => repairTenant(tn)} disabled={repairingId === tn.id} className="font-bold border-indigo-200 text-indigo-700">صيانة</Button>
                     <Button size="sm" variant={tn.is_active ? "outline" : "default"} onClick={() => toggleStatus(tn)} className="font-black rounded-xl">{tn.is_active ? "إيقاف" : "تفعيل"}</Button>
                   </div>
                </div>
             </Card>
           );
        })}
      </div>
    </div>
  );
}

function HealthBadge({ label, ok }: { label: string, ok?: boolean }) {
  return <Badge variant="outline" className={`text-[10px] font-bold ${ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>{label}</Badge>;
}

function Kpi({ label, value, icon, sub, tone }: any) {
  const colors: any = { emerald: "text-emerald-700 bg-emerald-50 border-emerald-100", indigo: "text-indigo-700 bg-indigo-50 border-indigo-100", blue: "text-blue-700 bg-blue-50 border-blue-100" };
  return (
    <Card className={`p-5 flex items-center justify-between gap-4 border ${colors[tone] || "bg-white border-slate-100"}`}>
       <div className="space-y-1">
          <p className="text-xs font-bold opacity-70">{label}</p>
          <p className="text-3xl font-black font-mono">{value}</p>
          <p className="text-[10px] font-bold opacity-80">{sub}</p>
       </div>
       <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center shrink-0 shadow-sm">{icon}</div>
    </Card>
  );
}

function NewTenantForm({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(adminApi.createTenant);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fn({ name, slug, businessType: 'laundry', ownerEmail: email, ownerPassword: password, ownerFullName: fullName });
      toast.success("تم تأسيس المشروع بنجاح");
      onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4 pt-2">
      <div><Label className="text-xs font-bold">اسم المشروع *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl" /></div>
      <div><Label className="text-xs font-bold">كود المسار (Slug) *</Label><Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required className="rounded-xl" /></div>
      <div className="grid grid-cols-2 gap-3">
         <div><Label className="text-xs font-bold">اسم المالك *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="rounded-xl" /></div>
         <div><Label className="text-xs font-bold">إيميل المالك *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl" /></div>
      </div>
      <div><Label className="text-xs font-bold">كلمة المرور *</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="rounded-xl" /></div>
      <Button type="submit" disabled={loading} className="w-full h-12 bg-brand-blue text-white font-black rounded-2xl shadow-lg">
        {loading ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <Plus className="w-4 h-4 ms-2" />}
        <span>تأسيس المشروع الآن</span>
      </Button>
    </form>
  );
}
