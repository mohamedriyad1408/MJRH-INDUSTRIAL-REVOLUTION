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
import {
  Plus, Loader2, Building2, ShieldCheck, Zap, Server,
  TrendingUp, Users, DollarSign, ExternalLink, Activity, CheckCircle2,
  AlertTriangle, RefreshCw, Power, Eye, Search, Filter,
  Crown, ReceiptText, Banknote, Briefcase,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_admin/admin/tenants/")({
  head: () => ({ meta: [{ title: "غرفة عمليات السوبر أدمن — إدارة المشاريع السيادية V4" }] }),
  component: SuperAdminCommandCenter,
});

type Tenant = {
  id: string;
  name: string;
  slug: string;
  business_type?: string | null;
  is_active: boolean;
  owner_user_id: string | null;
  created_at: string;
  health_score?: number;
};

function SuperAdminCommandCenter() {
  const { t, dir } = useI18n();
  const { isSuperAdmin } = useAuth();
  const [list, setList] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  async function loadData() {
    setLoading(true);
    try {
      // V4 Sovereign Query: Fetching from L1 (Nodes/Identities) and L6 (Health)
      const { data: nodes, error } = await supabase
        .from('v4_l1.nodes' as any)
        .select(`
            id,
            node_path,
            current_state,
            created_at,
            identities!inner (
                id,
                legal_name,
                global_urn,
                sovereign_owner_id
            ),
            health:v4_l6.node_health_scores (
                total_score
            )
        `)
        .eq('node_class', 'SOVEREIGN_ROOT')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Tenant[] = (nodes || []).map((n: any) => ({
        id: n.id,
        name: n.identities.legal_name,
        slug: n.node_path.toString(),
        is_active: n.current_state === 'ACTIVE',
        owner_user_id: n.identities.sovereign_owner_id,
        created_at: n.created_at,
        health_score: n.health?.total_score || 0
      }));

      setList(mapped);
    } catch (err: any) {
      toast.error(err?.message || "فشل تحميل بيانات المنصة السيادية");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredTenants = useMemo(() => {
    let res = list;
    if (search.trim()) {
      const s = search.toLowerCase();
      res = res.filter((tn) => tn.name.toLowerCase().includes(s) || tn.slug.toLowerCase().includes(s));
    }
    return res;
  }, [list, search]);

  if (!isSuperAdmin) {
    return <Card className="p-12 text-center text-red-600 font-black">صلاحية مدير المنصة (Super Admin) فقط.</Card>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24" dir={dir}>
      {/* Executive Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-teal-300 text-xs font-mono font-black shadow-xs">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>SOVEREIGN V4 COMMAND CENTER</span>
            </div>
          </div>

          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Server className="w-8 h-8 md:w-9 md:h-9 text-red-600 shrink-0" />
            <span>إدارة الفواعل والمستأجرين السياديين</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 text-white font-black shadow-lg rounded-2xl h-11 px-6">
                <Plus className="w-5 h-5 ms-1.5" />
                <span>إطلاق مؤسسة سيادية جديدة</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl rounded-3xl" dir={dir}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-red-600" />
                  <span>تأسيس DNA مؤسسي جديد</span>
                </DialogTitle>
              </DialogHeader>
              <NewTenantForm onDone={() => { setOpenNew(false); loadData(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Modern Interactive Tenant Capsules Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto" />
          <div className="font-extrabold text-slate-700 text-base">جاري استعادة الوعي السيادي للنواة V4...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTenants.map((tn) => {
            const healthScore = tn.health_score || 100;
            return (
              <Card
                key={tn.id}
                className="border-2 transition-all duration-300 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4 relative overflow-hidden">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 overflow-hidden shadow-md">
                        <Building2 className="w-7 h-7" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-xl text-white truncate">{tn.name}</h3>
                        </div>
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 font-mono font-black text-xs">
                           URN: {tn.slug}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge className={`text-xs font-black px-3 py-1 shadow-sm ${tn.is_active ? "bg-emerald-500 text-white" : "bg-red-600 text-white"}`}>
                        {tn.is_active ? "سيادة نشطة" : "سيادة موقوفة"}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">L6 Health Score</span>
                        <span className={`text-xl font-black ${healthScore > 80 ? 'text-green-500' : 'text-red-500'}`}>{healthScore}%</span>
                     </div>
                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full transition-all" style={{ width: `${healthScore}%` }} />
                     </div>
                  </CardContent>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs">
                      <Link to={`/${tn.slug}/today` as any}>
                        <Eye className="w-3.5 h-3.5 ms-1 text-red-400" />
                        <span>عرض لوحة النبض</span>
                      </Link>
                    </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewTenantForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessType, setBusinessType] = useState("laundry");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // V4 Sovereign Launch via Admin API Bridge
      await adminApi.launchEnterprise({
        name,
        slug,
        ownerEmail: email,
        ownerPassword: password,
        ownerFullName: fullName,
        businessType
      });
      toast.success("تم حقن الجينات المؤسسية وتفعيل السيادة بنجاح");
      onDone();
    } catch (err: any) {
      toast.error(err.message || "فشل إطلاق المؤسسة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 pt-2">
      <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">اسم المؤسسة السيادية *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Grand Hotel Holding" className="bg-white rounded-xl font-bold" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">القالب التشغيلي (DNA) *</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger className="bg-white rounded-xl font-bold text-xs h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="laundry">مغسلة صناعية / Industrial Laundry</SelectItem>
                <SelectItem value="retail">تجزئة / Retail</SelectItem>
                <SelectItem value="services">خدمات / Services</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
            <Label className="text-xs font-bold text-slate-700 mb-1 block">المعرف الفريد (Slug/URN) *</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required placeholder="grand-hotel" className="bg-white rounded-xl font-mono font-black" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl h-12 px-8 shadow-lg">
          {loading ? <Loader2 className="w-5 h-5 animate-spin ms-2" /> : <Plus className="w-5 h-5 ms-2" />}
          <span>تفعيل السيادة (Launch V4)</span>
        </Button>
      </div>
    </form>
  );
}
