import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, Building2, Factory, Hotel, Hospital, Utensils, Boxes, Shield, Zap, Layers, Globe, Users, Store, HeartHandshake } from "lucide-react";

export const Route = createLazyFileRoute("/landing")({
  component: LandingPage,
});

function LandingPage() {
  const { t, dir } = useI18n();

  return (
    <div className="min-h-screen bg-white text-slate-900" dir={dir}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden">
                <img src="/mjrh-logo.png" alt="MJRH" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <div className="font-black text-[15px] tracking-tight">MJRH</div>
                <div className="text-[10px] text-slate-500 -mt-1 tracking-widest font-bold uppercase font-mono">Industrial Revolution</div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex"><Link to="/login">{t("landing.login")}</Link></Button>
            <Button asChild size="sm" className="bg-brand-blue hover:bg-slate-900 text-white rounded-full px-5 font-bold">
              <Link to="/login">{t("landing.login")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* HERO */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7 text-start">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {t("landing.badge")}
            </div>

            <h1 className="text-[40px] md:text-[56px] font-black tracking-[-0.03em] leading-[0.95] text-slate-950">
              {t("landing.heroTitle")}
            </h1>

            <p className="text-[17px] leading-8 text-slate-600 max-w-[48ch] font-medium">
              {t("landing.heroText")}
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-brand-blue hover:bg-slate-900 h-12 px-7 font-black">
                <Link to="/login">{t("landing.login")} <ArrowLeft className="w-4 h-4 ms-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-6 font-bold border-2">
                <a href="/customer-portal?tenant=dry-tech">{t("landing.ctaPortal")}</a>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
               <span className="flex items-center gap-2"><Hotel className="w-3.5 h-3.5" /> HOTELS</span>
               <span className="flex items-center gap-2"><Hospital className="w-3.5 h-3.5" /> HOSPITALS</span>
               <span className="flex items-center gap-2"><Utensils className="w-3.5 h-3.5" /> RESTAURANTS</span>
               <span className="flex items-center gap-2"><Factory className="w-3.5 h-3.5" /> FACTORIES</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-teal-100 via-blue-100 to-amber-100 rounded-[2rem] blur-2xl opacity-60" />
            <Card className="relative shadow-2xl border-0 rounded-[1.5rem] overflow-hidden bg-white">
              <div className="p-2">
                <img src="/hero-workflow.png" alt="MJRH Workflow" className="w-full rounded-[1rem] object-contain bg-slate-50 shadow-inner" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="font-black text-sm text-slate-900 uppercase tracking-tight">Enterprise Infrastructure</div>
                  <Badge variant="outline" className="text-[10px] font-black border-teal-200 text-teal-700 bg-teal-50 uppercase">Live Operations</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center border-t pt-4">
                  <div><div className="text-xl font-black text-slate-950">500+</div><div className="text-[9px] text-slate-400 font-bold uppercase">Branches</div></div>
                  <div className="border-x"><div className="text-xl font-black text-slate-950">12K+</div><div className="text-[9px] text-slate-400 font-bold uppercase">Orders/Day</div></div>
                  <div><div className="text-xl font-black text-slate-950">100%</div><div className="text-[9px] text-slate-400 font-bold uppercase">Uptime</div></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="py-20 border-t border-slate-100">
           <div className="text-center mb-12 space-y-3">
              <h2 className="text-3xl font-black text-slate-950 tracking-tight">{t("landing.toolsTitle")}</h2>
              <p className="text-slate-500 font-medium max-w-xl mx-auto">{t("landing.toolsText")}</p>
           </div>
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Feature icon={<Layers className="text-blue-600" />} title={t("landing.f2Title")} desc={t("landing.f2Text")} />
              <Feature icon={<Users className="text-teal-600" />} title={t("landing.f3Title")} desc={t("landing.f3Text")} />
              <Feature icon={<Shield className="text-indigo-600" />} title={t("landing.f7Title")} desc={t("landing.f7Text")} />
              <Feature icon={<Zap className="text-amber-600" />} title={t("landing.f5Title")} desc={t("landing.f5Text")} />
           </div>
        </section>

        {/* ENTERPRISE BLOCK */}
        <section className="py-20">
          <Card className="bg-slate-950 text-white border-0 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardContent className="p-8 md:p-14 grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge className="bg-white/10 text-teal-300 border-white/10 font-black">ENTERPRISE OS</Badge>
                <h3 className="text-3xl md:text-4xl font-black leading-tight text-white">{t("landing.heroTitle")}</h3>
                <p className="text-slate-400 font-medium leading-relaxed">{t("landing.heroText")}</p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                   <div className="space-y-2">
                      <div className="h-1 bg-teal-500 w-12 rounded-full" />
                      <div className="font-bold text-sm">Full Sovereign Control</div>
                   </div>
                   <div className="space-y-2">
                      <div className="h-1 bg-blue-500 w-12 rounded-full" />
                      <div className="font-bold text-sm">Real-time BI Analytics</div>
                   </div>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute -inset-2 bg-teal-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-white/5 rounded-3xl p-4 border border-white/10 backdrop-blur-sm relative">
                  <img src="/mjrh-logo.png" alt="Enterprise" className="w-32 mx-auto drop-shadow-xl" />
                  <div className="mt-8 space-y-3">
                     <div className="h-2 bg-white/10 rounded-full w-full" />
                     <div className="h-2 bg-white/10 rounded-full w-2/3" />
                     <div className="h-2 bg-white/10 rounded-full w-4/5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 text-center space-y-8">
           <div className="inline-flex h-16 w-16 rounded-3xl bg-teal-50 border-2 border-teal-100 items-center justify-center mb-4">
              <HeartHandshake className="w-8 h-8 text-teal-600" />
           </div>
           <h2 className="text-4xl font-black text-slate-950 tracking-tight">جاهز لثورة تشغيلية في مشروعك؟</h2>
           <p className="text-slate-500 font-medium max-w-xl mx-auto">انضم إلى مئات المؤسسات التي تعتمد على MJRH لإدارة عملياتها المعقدة بكل سهولة وذكاء.</p>
           <div className="pt-4 flex justify-center gap-4">
              <Button asChild size="lg" className="rounded-2xl bg-brand-blue hover:bg-slate-900 h-14 px-10 font-black shadow-lg shadow-blue-900/20">
                <Link to="/login">دخول المنصة الآن</Link>
              </Button>
           </div>
        </section>

        {/* FOOTER */}
        <footer className="py-12 border-t border-slate-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-slate-950 flex items-center justify-center shadow-lg">
                <img src="/mjrh-logo.png" alt="MJRH" className="h-6 w-6 object-contain" />
              </div>
              <div className="text-start">
                <div className="font-black text-slate-950 text-sm">MJRH INDUSTRIAL REVOLUTION</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">© {new Date().getFullYear()} BY MUHAMMAD RIYAD</div>
              </div>
            </div>
            <div className="flex items-center gap-8 text-[13px] font-black text-slate-500 uppercase tracking-tight">
              <Link to="/privacy" className="hover:text-brand-blue transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-brand-blue transition-colors">Terms</Link>
              <Link to="/login" className="text-brand-blue">Support</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="border-slate-100 hover:border-blue-100 hover:shadow-xl transition-all duration-300 rounded-3xl group overflow-hidden">
      <CardContent className="p-6 space-y-4 text-start">
        <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center transition-colors group-hover:bg-blue-50 group-hover:border-blue-200">
           {icon}
        </div>
        <div className="space-y-2">
           <div className="font-black text-slate-950 text-sm tracking-tight">{title}</div>
           <p className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );
}
