import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { Loader2, Shirt, ArrowLeft, Building2, LogIn, ShieldCheck, Boxes, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "MJRH — نظام تشغيل المشاريع" }] }),
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
  const { session, loading: authLoading, isSuperAdmin, hasRole } = useAuth();
  const nav = useNavigate();
  const [tenants, setTenants] = useState<ActiveTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  // إذا كان المستخدم مسجّل دخوله بالفعل (موظف/مالك/سوبر أدمن)، حوّله لصفحته المناسبة
  // بدل ما يشوف دليل المشاريع العام. الزوار بدون جلسة يشوفون الدليل كما هو.
  useEffect(() => {
    if (authLoading || !session) return;
    if (isSuperAdmin) return void nav({ to: "/admin/tenants" });
    if (hasRole("owner", "ops_manager", "cs_manager")) return void nav({ to: "/today" });
    if (hasRole("courier")) return void nav({ to: "/driver" });
    // موظف بدور محطة، أو مستخدم بجلسة بدون دور بعد (بانتظار التفعيل) — كلاهما تتكفل بهما /dashboard.
    nav({ to: "/dashboard" });
  }, [authLoading, session, isSuperAdmin, hasRole, nav]);

  useEffect(() => {
    supabase
      .rpc("list_active_tenants_public")
      .then(({ data, error }: any) => {
        if (error) { setErrored(true); return; }
        setTenants((data ?? []) as ActiveTenant[]);
      })
      .finally(() => setLoading(false));
  }, []);

  // بينما بيتحدد لو فيه جلسة مسجلة أو لأ، أو بينما بنجهز التحويل لمستخدم مسجل دخوله بالفعل،
  // نعرض مؤشر تحميل بدل ما يظهر دليل المشاريع للحظة ثم يختفي.
  if (authLoading || session) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;
  }

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_right,#99f6e4,transparent_28rem),radial-gradient(circle_at_bottom_left,#ddd6fe,transparent_30rem),linear-gradient(135deg,#f8fafc,#eef2ff)]"
      dir={dir}
    >
      <header className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white p-1 shadow-md border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/mjrh-logo.png" alt="MJRH Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-black text-xl text-slate-900 tracking-tight">MJRH</div>
            <div className="text-xs text-slate-500 font-semibold">{t("home.tagline", "منظومة تشغيل المشاريع — Industrial Revolution")}</div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <LanguageSwitcher compact />
          <Button asChild variant="outline" size="sm" className="font-bold border-slate-300 hover:bg-slate-100 text-slate-800">
            <Link to="/login"><LogIn className="w-4 h-4 ms-1 text-teal-600" /> {t("home.platformLogin", "🛡️ إدارة وموظفو المنصة")}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="text-center py-8 md:py-12 space-y-5">
          <div className="flex justify-center mb-2">
            <img src="/mjrh-logo.png" alt="MJRH INDUSTRIAL REVOLUTION" className="h-36 sm:h-48 md:h-56 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-1.5 text-xs font-bold text-teal-800 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> {t("home.badge", "منصة MJRH لتشغيل المشاريع")}
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 leading-tight">
            {t("home.heroTitle", "نظام واحد.. يشغّل أكثر من مشروع")}
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-8 max-w-2xl mx-auto">
            {t(
              "home.heroText",
              "MJRH منظومة تشغيل SaaS تخدم عدة مشاريع مستقلة، كل مشروع له بياناته وحساباته وموظفوه الخاصون. اختر المشروع اللي محتاج تدخله من القائمة، أو تعرّف أكتر على النظام."
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/landing">
                {t("home.learnMore", "تعرّف على النظام")} <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="py-6">
          <div className="text-center mb-6 space-y-3">
            <h2 className="text-2xl font-black flex items-center justify-center gap-2">
              <Boxes className="w-5 h-5 text-teal-700" /> {t("home.projectsTitle", "المشاريع النشطة")}
            </h2>
            <p className="text-slate-600 text-sm font-medium">{t("home.projectsText", "اختر مشروعك للدخول على بوابة العملاء أو الموظفين")}</p>
            <div className="max-w-2xl mx-auto p-3 rounded-2xl bg-teal-50/90 border border-teal-200 text-teal-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 text-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{t("home.tenantNotice", "تنويه مهم: عملاء وموظفو المشاريع يرجى النقر على بطاقة مشروعكم أدناه للدخول إلى بوابة العميل أو لوحة التحكم الخاصة بالمشروع.")}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : errored ? (
            <Card className="max-w-md mx-auto"><CardContent className="p-6 text-center text-sm text-muted-foreground">{t("home.loadError", "تعذر تحميل قائمة المشاريع حاليًا.")}</CardContent></Card>
          ) : !tenants.length ? (
            <Card className="max-w-md mx-auto"><CardContent className="p-8 text-center text-sm text-muted-foreground">{t("home.noProjects", "لا توجد مشاريع نشطة حاليًا.")}</CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {tenants.map((tn) => {
                const color = tn.brand_color || "#0d9488";
                return (
                  <Link key={tn.slug} to="/$slug" params={{ slug: tn.slug }} className="block">
                    <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-shadow overflow-hidden">
                      <div className="p-5 flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 overflow-hidden shadow-md"
                          style={{ background: `linear-gradient(135deg, ${color}, #0f172a)` }}
                        >
                          {tn.logo_url ? (
                            <img src={tn.logo_url} className="w-full h-full object-cover" />
                          ) : (
                            <Shirt className="w-6 h-6" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-lg truncate">{tn.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {businessTypeLabel(t, tn.business_type)}
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="py-6">
          <Card className="max-w-3xl mx-auto border-0 bg-slate-950 text-white shadow-2xl">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center"><Sparkles className="w-5 h-5 text-teal-300" /></div>
                <div>
                  <div className="font-black">{t("home.wantProject", "عندك مشروع وعايز تشغله بنظام MJRH؟")}</div>
                  <div className="text-xs text-white/60">{t("home.wantProjectSub", "تواصل معنا لبدء تجربة مباشرة")}</div>
                </div>
              </div>
              <Button asChild className="bg-teal-600 hover:bg-teal-700 shrink-0">
                <a href="https://wa.me/201130804784?text=عايز%20تجربة%20MJRH" target="_blank" rel="noreferrer">
                  {t("home.requestDemo", "اطلب تجربة")}
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <footer className="py-6 text-center text-xs text-slate-500 space-y-2 font-medium">
          <div>© {new Date().getFullYear()} MJRH INDUSTRIAL REVOLUTION — BY MUHAMMAD RIYAD</div>
          <div className="flex justify-center gap-4">
            <Link to="/privacy" className="hover:underline">{t("legal.privacyTitle", "الخصوصية")}</Link>
            <Link to="/terms" className="hover:underline">{t("legal.termsTitle", "الشروط")}</Link>
            <Link to="/login" className="hover:underline font-bold text-slate-700">{t("home.platformLogin", "دخول إدارة وموظفي المنصة")}</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
