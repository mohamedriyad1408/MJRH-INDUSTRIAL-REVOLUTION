import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, Building2, Factory, Hotel, Hospital, Utensils, Boxes, Shield, Zap, Layers, Globe, Users, Store } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({ meta: [{ title: "MJRH — Industrial Revolution" }] }),
  component: LandingPage,
});

function LandingPage() {
  const { t, dir } = useI18n();
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("workflow_templates").select("*").eq("is_active", true).eq("is_featured", true).limit(6).then(({ data }: any) => {
      if (data) setTemplates(data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900" dir={dir}>
      {/* HEADER - Clean, minimal */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden">
                <img src="/icon-512.png" alt="MJRH" className="h-6 w-6 object-contain logo-animated" />
              </div>
              <div>
                <div className="font-black text-[15px] tracking-tight">MJRH</div>
                <div className="text-[10px] text-slate-500 -mt-1 tracking-widest font-bold">INDUSTRIAL REVOLUTION</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-slate-600">
              <a href="#platform" className="hover:text-slate-900">{t("landing.navPlatform")}</a>
              <a href="#solutions" className="hover:text-slate-900">{t("landing.navSolutions")}</a>
              <a href="#enterprise" className="hover:text-slate-900">{t("landing.navEnterprise")}</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex"><Link to="/login">{t("landing.login")}</Link></Button>
            <Button asChild size="sm" className="bg-slate-900 hover:bg-black text-white rounded-full px-5">
              <Link to="/login">{t("landing.ctaStartNow")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* HERO */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {t("landing.badge")}
            </div>

            <h1 className="text-[40px] md:text-[56px] font-black tracking-[-0.03em] leading-[0.95]">
              {t("landing.heroTitle")}
            </h1>

            <p className="text-[17px] leading-8 text-slate-600 max-w-[48ch]">
              {t("landing.heroText")}
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-slate-900 hover:bg-black h-12 px-7">
                <Link to="/">{t("landing.ctaExploreProjects")} <ArrowLeft className="w-4 h-4 ms-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-6">
                <Link to="/login">{t("landing.ctaEnterPlatform")}</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-2"><Hotel className="w-3.5 h-3.5" /> {t("landing.trustedHotelsShort")}</span>
              <span className="flex items-center gap-2"><Hospital className="w-3.5 h-3.5" /> {t("landing.trustedHospitalsShort")}</span>
              <span className="flex items-center gap-2"><Utensils className="w-3.5 h-3.5" /> {t("landing.trustedRestaurantsShort")}</span>
              <span className="flex items-center gap-2"><Factory className="w-3.5 h-3.5" /> {t("landing.trustedFactoriesShort")}</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-teal-100 via-violet-100 to-amber-100 rounded-[2rem] blur-2xl opacity-60" />
            <Card className="relative shadow-2xl border-0 rounded-[1.5rem] overflow-hidden bg-white">
              <div className="p-2">
                <img src="/hero-workflow.png" alt="MJRH Workflow" className="w-full rounded-[1rem] object-contain bg-slate-50 logo-animated" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm">{t("landing.enterpriseCore")}</div>
                  <Badge variant="outline" className="text-[10px]">{t("landing.liveBadge")}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xl font-black">{t("landing.branchCount")}</div><div className="text-[10px] text-slate-500">{t("landing.branchLabel")}</div></div>
                  <div className="border-x"><div className="text-xl font-black">{t("landing.companiesCount")}</div><div className="text-[10px] text-slate-500">{t("landing.companiesLabel")}</div></div>
                  <div><div className="text-xl font-black">{t("landing.customCount")}</div><div className="text-[10px] text-slate-500">{t("landing.customLabel")}</div></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* TRUSTED STRIP */}
        <section className="py-8 border-y border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-6 text-sm">
            <span className="text-slate-400 font-medium">{t("landing.trustedLabel")}</span>
            <div className="flex flex-wrap gap-8 font-bold text-slate-700">
              <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> {t("landing.trusted7Star")}</span>
              <span className="flex items-center gap-2"><Hospital className="w-4 h-4" /> {t("landing.trustedHospitals")}</span>
              <span className="flex items-center gap-2"><Utensils className="w-4 h-4" /> {t("landing.trustedChains")}</span>
              <span className="flex items-center gap-2"><Boxes className="w-4 h-4" /> {t("landing.trustedFactoriesWorkshops")}</span>
            </div>
          </div>
        </section>

        {/* MARKETPLACE PREVIEW */}
        <section className="py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2"><Store className="w-5 h-5" /> {t("landing.marketplaceTitle")}</h2>
              <p className="text-sm text-slate-600 mt-1">{t("landing.marketplaceSubtitle")}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full"><Link to="/marketplace">{t("landing.viewMarketplace")} <ArrowLeft className="w-3 h-3 ms-1" /></Link></Button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map((tpl: any) => (
              <Card key={tpl.id} className="hover:shadow-lg transition-all border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl">{tpl.icon}</div>
                    <div>
                      <div className="font-bold text-sm">{tpl.name}</div>
                      <div className="text-[11px] text-slate-500">{tpl.category} • {tpl.stages?.length} stages</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2">{tpl.description}</p>
                  <div className="mt-3 flex gap-1 flex-wrap">
                    {tpl.stages?.slice(0,3).map((s:any,i:number) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-slate-100 border">{s.icon} {s.name}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="platform" className="py-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight">{t("landing.featuresTitle")}</h2>
            <p className="text-slate-600 mt-3">{t("landing.featuresSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            <Feature icon={<Layers />} title={t("landing.featureCustomStagesTitle")} desc={t("landing.featureCustomStagesDesc")} />
            <Feature icon={<Users />} title={t("landing.featureTeamRolesTitle")} desc={t("landing.featureTeamRolesDesc")} />
            <Feature icon={<Shield />} title={t("landing.featureCashAccountingTitle")} desc={t("landing.featureCashAccountingDesc")} />
            <Feature icon={<Globe />} title={t("landing.featureMultiBranchTitle")} desc={t("landing.featureMultiBranchDesc")} />
            <Feature icon={<Zap />} title={t("landing.featureSmartDistributionTitle")} desc={t("landing.featureSmartDistributionDesc")} />
            <Feature icon={<Boxes />} title={t("landing.featureInventoryServicesTitle")} desc={t("landing.featureInventoryServicesDesc")} />
          </div>
        </section>

        {/* ENTERPRISE */}
        <section id="enterprise" className="py-16">
          <Card className="bg-slate-900 text-white border-0 rounded-[2rem] overflow-hidden">
            <CardContent className="p-8 md:p-10 grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-5">
                <Badge className="bg-white/10 text-white border-white/20">{t("landing.enterpriseBadge")}</Badge>
                <h3 className="text-3xl font-black leading-tight whitespace-pre-line">{t("landing.enterpriseTitle")}</h3>
                <p className="text-white/60 leading-7">{t("landing.enterpriseDesc")}</p>
                <ul className="space-y-2 text-sm">
                  <Li>{t("landing.enterpriseLi1")}</Li>
                  <Li>{t("landing.enterpriseLi2")}</Li>
                  <Li>{t("landing.enterpriseLi3")}</Li>
                  <Li>{t("landing.enterpriseLi4")}</Li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl p-4">
                <img src="/hero-workflow.png" alt="Enterprise" className="w-full" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="py-12 text-center">
          <h2 className="text-3xl font-black">{t("landing.ctaReadyTitle")}</h2>
          <p className="text-slate-600 mt-2">{t("landing.ctaReadySubtitle")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-slate-900 h-12 px-8"><Link to="/">{t("landing.ctaExplore")}</Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12"><Link to="/login">{t("landing.ctaLoginPlatform")}</Link></Button>
          </div>
        </section>

        <footer className="py-10 border-t border-slate-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <img src="/icon-512.png" alt="MJRH" className="h-5 w-5 object-contain logo-animated" />
              </div>
              <div>
                <div className="font-black">MJRH INDUSTRIAL REVOLUTION</div>
                <div className="text-xs text-slate-500">© {new Date().getFullYear()} BY MUHAMMAD RIYAD</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-slate-500">
              <Link to="/privacy" className="hover:text-slate-900">{t("landing.footerPrivacy")}</Link>
              <Link to="/terms" className="hover:text-slate-900">{t("landing.footerTerms")}</Link>
              <Link to="/login" className="hover:text-slate-900 font-bold">{t("landing.footerLogin")}</Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>{t("landing.footerEnterpriseOS")}</div>
            <a href="tel:+201130804784" className="font-bold hover:text-slate-900">+20 113 080 4784</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="space-y-3">
      <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">{icon}</div>
      <div className="font-bold">{title}</div>
      <div className="text-sm text-slate-600 leading-6">{desc}</div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2"><Check className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />{children}</li>;
}
