import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, interpolate } from "@/lib/i18n";
import { Loader2, Building2, Hotel, Hospital, Utensils, Factory, Globe, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "MJRH — Industrial Revolution" }] }),
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
      laundry: t("biz.laundry", "Laundry"),
      retail: t("biz.retail", "Retail"),
      manufacturing: t("biz.manufacturing", "Manufacturing"),
      services: t("biz.services", "Services"),
    } as Record<string, string>
  )[key] ?? t("biz.generic", "General");
}

function HomeDirectory() {
  const { t, dir } = useI18n();
  const { session, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<ActiveTenant[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
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

    supabase.from("workflow_templates").select("*").eq("is_active", true).eq("is_featured", true).limit(6).then(({ data }: any) => {
      if (data) setTemplates(data);
    });
  }, []);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-900" /></div>;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900" dir={dir}>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 h-[64px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <img src="/icon-512.png" alt="MJRH" className="h-5 w-5 object-contain logo-animated" />
            </div>
            <div className="font-black tracking-tight">MJRH</div>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm"><Link to="/landing">{t("home.footerPlatform")}</Link></Button>
            <Button asChild size="sm" className="rounded-full bg-slate-900 hover:bg-black"><Link to="/login">{t("home.ctaLogin")}</Link></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="max-w-3xl mx-auto text-center space-y-6 py-8">
          <Badge variant="outline" className="rounded-full border-slate-200">{t("home.badgeEnterprise")}</Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-[0.9]">
            {t("home.heroTitlePlatform")}
          </h1>
          <p className="text-lg text-slate-600 leading-8 max-w-2xl mx-auto">
            {t("home.heroTextPlatform")}
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild size="lg" className="rounded-full h-11 px-7 bg-slate-900 hover:bg-black"><Link to="/landing">{t("home.ctaExplorePlatform")} <ArrowLeft className="w-4 h-4 ms-2" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-11"><Link to="/login">{t("home.ctaLogin")}</Link></Button>
          </div>
        </section>

        <section className="py-8">
          <Card className="border shadow-xl rounded-[1.5rem] overflow-hidden max-w-4xl mx-auto">
            <div className="bg-slate-50 p-6 md:p-10">
              <img src="/hero-workflow.png" alt="Workflow" className="w-full object-contain max-h-[360px] logo-animated" />
            </div>
            <div className="grid grid-cols-3 divide-x border-t bg-white text-center">
              <div className="p-4"><div className="text-xl font-black">{t("home.statsBranchCount")}</div><div className="text-xs text-slate-500">{t("home.statsBranchLabel")}</div></div>
              <div className="p-4"><div className="text-xl font-black">{t("home.statsMultiCount")}</div><div className="text-xs text-slate-500">{t("home.statsMultiLabel")}</div></div>
              <div className="p-4"><div className="text-xl font-black">{t("home.statsInfiniteCount")}</div><div className="text-xs text-slate-500">{t("home.statsInfiniteLabel")}</div></div>
            </div>
          </Card>
        </section>

        <section className="py-10 border-y border-slate-100 my-10">
          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-2"><Hotel className="w-4 h-4" /> {t("home.trustedHotels")}</span>
            <span className="flex items-center gap-2"><Hospital className="w-4 h-4" /> {t("home.trustedHospitals")}</span>
            <span className="flex items-center gap-2"><Utensils className="w-4 h-4" /> {t("home.trustedRestaurantChains")}</span>
            <span className="flex items-center gap-2"><Factory className="w-4 h-4" /> {t("home.trustedFactories")}</span>
            <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> {t("home.trustedMultiCountry")}</span>
          </div>
        </section>

        <section id="active-projects-list" className="py-8">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-black">{t("home.activeProjectsTitle")}</h2>
            <span className="text-xs text-slate-500">{interpolate(t("home.activeProjectsCount"), { count: tenants.length })}</span>
          </div>
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : errored || !tenants.length ? (
            <Card><CardContent className="p-8 text-center text-sm text-slate-500">{t("home.noActiveProjects")}</CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenants.map((tn) => (
                <Link key={tn.slug} to="/$slug" params={{ slug: tn.slug }} className="group">
                  <Card className="h-full border hover:border-slate-900 hover:shadow-lg transition-all">
                    <CardContent className="p-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center overflow-hidden">
                        {tn.logo_url ? <img src={tn.logo_url} className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{tn.name}</div>
                        <div className="text-xs text-slate-500">{businessTypeLabel(t, tn.business_type)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black">{t("home.marketplaceTitle")}</h2>
              <p className="text-sm text-slate-600 mt-1">{t("home.marketplaceSubtitleNote")}</p>
            </div>
            <a href="/marketplace" className="text-sm font-bold text-teal-700 hover:underline">{t("home.viewMarketplace")} →</a>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map((tpl: any) => (
              <div key={tpl.slug} className="rounded-2xl border bg-white p-4 hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl">{tpl.icon}</div>
                  <div>
                    <div className="font-bold text-sm">{tpl.name}</div>
                    <div className="text-[11px] text-slate-500">{tpl.category} • {tpl.stages?.length} stages</div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-3 line-clamp-2">{tpl.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            {t("home.marketplaceDiffNote")}
          </div>
        </section>

        <section className="py-16 text-center">
          <h2 className="text-3xl font-black">{t("home.ctaReadyTitle")}</h2>
          <p className="text-slate-600 mt-2">{t("home.ctaReadySubtitle")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild className="rounded-full bg-slate-900 h-11 px-7"><Link to="/landing">{t("home.ctaExplore")}</Link></Button>
            <Button asChild variant="outline" className="rounded-full h-11"><Link to="/login">{t("home.ctaLogin2")}</Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <img src="/icon-512.png" alt="MJRH" className="h-5 w-5 object-contain logo-animated" />
            </div>
            <div>
              <div className="font-black text-sm">© {new Date().getFullYear()} MJRH INDUSTRIAL REVOLUTION</div>
              <div className="text-xs text-slate-500">BY MUHAMMAD RIYAD — Enterprise OS</div>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1 text-xs text-slate-600">
            <a href="tel:+201130804784" className="font-bold hover:text-slate-900">+20 113 080 4784</a>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:underline">{t("home.footerPrivacy")}</Link>
              <Link to="/terms" className="hover:underline">{t("home.footerTerms")}</Link>
              <Link to="/landing" className="hover:underline">{t("home.footerPlatform")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
