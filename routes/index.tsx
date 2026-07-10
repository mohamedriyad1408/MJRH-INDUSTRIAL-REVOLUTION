import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { Loader2, Building2, LogIn, ShieldCheck, Layers, Hotel, Hospital, Utensils, Factory, Globe, ArrowLeft, Phone } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "MJRH — منظومة تشغيل المشاريع | Industrial Revolution" }] }),
  component: HomeDirectory,
});

type ActiveTenant = {
  slug: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  business_type: string | null;
  public_url: string | null;
};

function businessTypeLabel(t: (k: string, f?: string) => string, type: string | null) {
  const key = type ?? "laundry";
  return (
    {
      laundry: t("biz.laundry", "مغسلة"),
      retail: t("biz.retail", "تجاري"),
      manufacturing: t("biz.manufacturing", "صناعي"),
      services: t("biz.services", "خدمات"),
    } as Record<string, string>
  )[key] ?? t("biz.generic", "عام");
}

function HomeDirectory() {
  const { t, dir } = useI18n();
  const { session, loading: authLoading, isSuperAdmin } = useAuth();
  const [tenants, setTenants] = useState<ActiveTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    supabase
      .rpc("list_active_tenants_public")
      .then(({ data, error }: any) => {
        if (error) { setErrored(true); return; }
        setTenants((data ?? []) as ActiveTenant[]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      {/* Header - Enterprise Grade */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-900 p-2 shadow-md flex items-center justify-center overflow-hidden">
              <img src="/icon-512.png" alt="MJRH" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="font-black text-lg leading-none tracking-tight">MJRH</div>
              <div className="text-[10px] font-bold tracking-widest text-slate-500">INDUSTRIAL REVOLUTION</div>
            </div>
            <Badge className="hidden sm:flex ml-2 bg-slate-900 text-white">Enterprise OS</Badge>
          </div>
          <div className="flex items-center gap-2">
            <a href="tel:+201130804784" className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-teal-700">
              <Phone className="w-3.5 h-3.5" /> +20 113 080 4784
            </a>
            <LanguageSwitcher compact />
            <Button asChild variant="outline" size="sm" className="font-bold">
              <Link to="/landing">المنصة</Link>
            </Button>
            <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 font-black">
              <Link to="/login"><LogIn className="w-4 h-4 me-1" /> دخول</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        {session && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center font-bold">🟢</div>
              <div>
                <div className="text-xs text-teal-300 font-bold uppercase">مسجل دخول</div>
                <div className="font-bold text-sm truncate">{session.user.email}</div>
              </div>
            </div>
            {isSuperAdmin && (
              <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700">
                <Link to="/admin/tenants">إدارة المنصة ←</Link>
              </Button>
            )}
          </div>
        )}

        {/* HERO - Enterprise, not بضاعة بلدي */}
        <section className="py-10 md:py-16 grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-slate-900 text-white">Built for Scale</Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">🏨 فنادق 7 نجوم</Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">🏥 مستشفيات</Badge>
              <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-200">🍽️ 50+ فرع</Badge>
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-slate-900">
              منظومة تشغيل
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-violet-600">مؤسسية بمعايير Oracle</span>
            </h1>

            <p className="text-lg text-slate-600 leading-8 font-medium max-w-xl">
              MJRH منظومة تشغيل <span className="font-black text-slate-900">مصممة من الأساس</span> للمؤسسات الكبرى — فندق 7 نجوم، مستشفى، سلسلة مطاعم 50 فرع، مصنع. نفس النواة، نفس الأمان، قابلية تخصيص كاملة لكل عميل بدون إعادة بناء.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-lg">
              <div className="rounded-2xl bg-white border shadow-sm p-3 text-center">
                <div className="text-xl font-black text-slate-900">50+</div>
                <div className="text-[10px] font-bold text-slate-500">فرع لكل مؤسسة</div>
              </div>
              <div className="rounded-2xl bg-white border shadow-sm p-3 text-center">
                <div className="text-xl font-black text-teal-600">Multi</div>
                <div className="text-[10px] font-bold text-slate-500">شركات متعددة</div>
              </div>
              <div className="rounded-2xl bg-white border shadow-sm p-3 text-center">
                <div className="text-xl font-black text-violet-600">∞</div>
                <div className="text-[10px] font-bold text-slate-500">تخصيص كامل</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 h-12 px-8 font-black">
                <Link to="/landing">استكشف المنصة <ArrowLeft className="w-4 h-4 ms-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12">
                <a href="https://wa.me/201130804784" target="_blank" rel="noreferrer" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> +20 113 080 4784
                </a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-r from-teal-400/20 via-violet-400/20 to-amber-400/20 rounded-[2rem] blur-2xl" />
            <Card className="relative border-0 shadow-2xl overflow-hidden">
              <div className="bg-white p-6">
                <img src="/hero-workflow.png" alt="MJRH Enterprise Workflow - Factory to Delivery" className="w-full object-contain" />
              </div>
              <CardContent className="p-4 bg-slate-50 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-600">Enterprise Core — نواة الشركات</div>
                  <Badge className="bg-slate-900 text-white text-[10px]">Oracle-like Power</Badge>
                </div>
                <div className="mt-2 text-xs text-slate-500 leading-5">شركة قابضة → مشاريع → فروع بمناطق → خزن منفصلة → تقارير مجمعة. كل عميل كبير يُفصّل له Workflow وحقول وتقارير.</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* TRUSTED BY */}
        <section className="py-6">
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-black text-slate-500">مصمم خصيصاً لـ:</span>
              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5"><Hotel className="w-4 h-4 text-amber-600" /> فنادق 7 نجوم</span>
                <span className="flex items-center gap-1.5"><Hospital className="w-4 h-4 text-blue-600" /> مستشفيات كبرى</span>
                <span className="flex items-center gap-1.5"><Utensils className="w-4 h-4 text-violet-600" /> سلاسل مطاعم 50+ فرع</span>
                <span className="flex items-center gap-1.5"><Factory className="w-4 h-4" /> مصانع وورش</span>
                <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-teal-600" /> شركات متعددة الدول</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ACTIVE PROJECTS - Professional */}
        <section className="py-8" id="active-projects-list">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">المشاريع النشطة على المنصة</h2>
              <p className="text-sm text-slate-600 mt-1">اختر مشروعك للدخول — كل مشروع له بياناته وصلاحياته المنفصلة</p>
            </div>
            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">{tenants.length} مشروع نشط</Badge>
          </div>

          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : errored ? (
            <Card className="max-w-md mx-auto"><CardContent className="p-6 text-center text-sm text-muted-foreground">{t("home.loadError")}</CardContent></Card>
          ) : !tenants.length ? (
            <Card className="max-w-md mx-auto"><CardContent className="p-8 text-center text-sm text-muted-foreground">{t("home.noProjects")}</CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenants.map((tn) => (
                <Link key={tn.slug} to="/$slug" params={{ slug: tn.slug }} className="block group">
                  <Card className="h-full border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
                    <div className="h-2 w-full" style={{ background: tn.brand_color || "#0d9488" }} />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 overflow-hidden">
                          {tn.logo_url ? <img src={tn.logo_url} className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black truncate group-hover:text-teal-700 transition">{tn.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {businessTypeLabel(t, tn.business_type)} • نشط
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CTA ENTERPRISE */}
        <section className="py-6">
          <Card className="border-0 bg-slate-900 text-white shadow-2xl overflow-hidden">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center"><Layers className="w-6 h-6 text-teal-300" /></div>
                <div>
                  <div className="font-black text-lg">عندك سلسلة فنادق أو مستشفى أو 50 فرع؟</div>
                  <div className="text-sm text-white/60">نفس المنصة، مع تخصيص كامل حسب احتياجاتك — بدون إعادة بناء</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100 font-black">
                  <a href="https://wa.me/201130804784?text=عرض%20Enterprise%20للفنادق%207%20نجوم" target="_blank" rel="noreferrer">
                    <Phone className="w-4 h-4 me-2" /> +20 113 080 4784 - عرض Enterprise
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="py-8 border-t mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-900 p-2 flex items-center justify-center">
                <img src="/icon-512.png" alt="MJRH" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="font-black text-sm">© {new Date().getFullYear()} MJRH INDUSTRIAL REVOLUTION</div>
                <div className="text-xs text-slate-500">BY MUHAMMAD RIYAD — Enterprise OS for Hotels, Hospitals, 50+ Chains</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <a href="tel:+201130804784" className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-teal-700">
                <Phone className="w-3.5 h-3.5" /> +20 113 080 4784
              </a>
              <span className="text-slate-300">|</span>
              <Link to="/privacy" className="hover:underline">الخصوصية</Link>
              <Link to="/terms" className="hover:underline">الشروط</Link>
              <Link to="/landing" className="hover:underline font-bold">المنصة</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
