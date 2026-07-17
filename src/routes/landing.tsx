import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, Building2, Factory, Hotel, Hospital, Utensils, Boxes, Shield, Zap, Layers, Globe, Users, Store, Cpu } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({ meta: [{ title: "MJRH — The Sovereign Business OS" }] }),
  component: LandingPage,
});

function LandingPage() {
  const { t, dir } = useI18n();
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    // V4 Shift: Querying industry templates (blueprints) instead of legacy table
    supabase.from("v4_industry.laundry_template" as any).select("*").limit(3).then(({ data }: any) => {
      if (data) setTemplates(data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-red-500/30" dir={dir}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-red-900/20">M</div>
              <div>
                <div className="font-black text-[16px] tracking-tight uppercase leading-none">MJRH V4</div>
                <div className="text-[9px] text-slate-500 tracking-[0.2em] font-bold mt-1 uppercase">Sovereign OS</div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm" className="hover:bg-white/5 text-slate-400"><Link to="/login">{t("landing.login")}</Link></Button>
            <Button asChild size="sm" className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-6 font-black shadow-lg shadow-red-900/20 transition-all">
              <Link to="/login">{t("landing.ctaStartNow")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* HERO */}
        <section className="pt-20 pb-16 md:pt-32 md:pb-24 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500">
              <Cpu className="w-3 h-3" />
              {t("landing.enterpriseCore")}
            </div>

            <h1 className="text-[44px] md:text-[68px] font-black tracking-tight leading-[0.9] text-white">
              {t("landing.heroTitle")}
            </h1>

            <p className="text-[18px] leading-relaxed text-slate-400 max-w-[45ch]">
              {isAr ? 'منظومة تشغيل سيادية تحول الأنماط التشغيلية للمؤسسات الكبرى إلى أصول برمجية غير قابلة للإنكار.' : 'A sovereign operating system that transforms operational patterns of major enterprises into non-repudiable software assets.'}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="rounded-2xl bg-white text-black hover:bg-slate-200 h-14 px-8 font-black shadow-xl">
                <Link to="/">{t("landing.ctaExploreProjects")} <ArrowLeft className="w-5 h-5 ms-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl h-14 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold">
                <Link to="/login">{t("landing.ctaEnterPlatform")}</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 bg-red-600/10 blur-[120px] rounded-full opacity-50" />
            <Card className="relative shadow-2xl border border-white/5 rounded-[2.5rem] overflow-hidden bg-slate-900/50 backdrop-blur-3xl">
               <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Sovereign Metrics</span>
                    <Badge className="bg-green-500 text-black font-black text-[10px] px-3">GENESIS ACTIVE</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-black/40 border border-white/5">
                        <div className="text-[32px] font-black text-white leading-none">10</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase mt-2">Core Layers</div>
                    </div>
                    <div className="p-5 rounded-3xl bg-black/40 border border-white/5">
                        <div className="text-[32px] font-black text-white leading-none">∞</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase mt-2">Unit Scale</div>
                    </div>
                  </div>
               </div>
            </Card>
          </div>
        </section>

        {/* MARKETPLACE PREVIEW */}
        <section className="py-20 border-t border-white/5">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black flex items-center gap-3 text-white uppercase tracking-tighter"><Store className="w-8 h-8 text-red-600" /> {t("landing.marketplaceTitle")}</h2>
              <p className="text-slate-500 mt-2 font-medium">{t("landing.marketplaceSubtitle")}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {templates.map((tpl: any) => (
              <Card key={tpl.id} className="hover:border-red-500/50 transition-all border-white/5 bg-slate-900/40 rounded-3xl overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-red-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-red-900/20 group-hover:scale-110 transition-transform">DNA</div>
                    <div>
                      <div className="font-black text-lg text-white uppercase tracking-tight">{tpl.name}</div>
                      <div className="text-[10px] text-slate-500 font-black uppercase">{tpl.value_stream_config?.activities?.length || 0} SECTIONS</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-4 leading-relaxed line-clamp-2">Sovereign blueprint for industrial operations. Includes automated ledger and SLA gating.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* REJECTED PATTERNS (Anti-Marketing) */}
        <section className="py-20 border-t border-white/5">
           <div className="text-center mb-12">
              <h2 className="text-xs font-black text-red-500 uppercase tracking-[0.4em] mb-4">Engineering Standards</h2>
              <h3 className="text-3xl font-black text-white">ما الذي قمنا بـ "تطهيره" في V4؟</h3>
           </div>
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AntiFeature title="No Direct UI Write" desc="جميع العمليات تتم عبر محرك النبض (L4) لضمان الحوكمة." />
              <AntiFeature title="No Static Stages" desc="المراحل تُولد ديناميكياً بناءً على حمضك النووي التشغيلي." />
              <AntiFeature title="No Logical Leaks" desc="عزل سيادي رياضي (L1) يمنع تداخل بيانات الشركات." />
              <AntiFeature title="No Blind Actions" desc="كل حركة تترك أثراً مشفراً غير قابل للمسح في الـ Ledger." />
           </div>
        </section>

      </main>

      <footer className="py-20 border-t border-white/5 bg-black/20">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center font-black text-black text-xl shadow-xl">M</div>
              <div>
                <div className="font-black text-white uppercase tracking-widest text-sm">MJRH V4 OS</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-tighter">Sovereign Industrial Intelligence</div>
              </div>
            </div>
            <div className="flex gap-10 text-xs font-black uppercase tracking-widest text-slate-500">
               <Link to="/privacy" className="hover:text-red-500 transition-colors">Privacy</Link>
               <Link to="/terms" className="hover:text-red-500 transition-colors">Terms</Link>
               <a href="tel:+201130804784" className="text-white hover:text-red-500 transition-colors">+20 113 080 4784</a>
            </div>
        </div>
      </footer>
    </div>
  );
}

function AntiFeature({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-3">
            <Check className="w-5 h-5 text-red-600" />
            <div className="font-black text-sm text-white uppercase tracking-tighter">{title}</div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">{desc}</p>
        </div>
    )
}

const isAr = true;
