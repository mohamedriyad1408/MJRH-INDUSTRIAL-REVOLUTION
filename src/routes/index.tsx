import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, interpolate } from "@/lib/i18n";
import { Loader2, Building2, Hotel, Hospital, Utensils, Factory, Globe, ArrowLeft, Store } from "lucide-react";

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
  const { t, dir, language } = useI18n();
  const { session, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<ActiveTenant[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    supabase
      .from("v4_l1.nodes" as any)
      .select(`
        id,
        node_path,
        current_state,
        translation,
        identities!inner (
            id,
            legal_name,
            metadata
        )
      `)
      .eq("node_class", "SOVEREIGN_ROOT")
      .eq("current_state", "ACTIVE")
      .then(({ data, error }: any) => {
        if (error) { 
            console.error("V4_ROOTS_ERROR:", error);
            setErrored(true); 
            return; 
        }
        const mapped = (data || []).map((n: any) => ({
            slug: n.node_path.toString().replace(/_/g, '-'), // Ensure compatibility with URL slugs
            name: (n.translation as any)?.[language] || n.identities.legal_name,
            logo_url: n.identities.metadata?.logo_url || null,
            brand_color: n.identities.metadata?.brand_color || null,
            business_type: n.identities.metadata?.business_type || "laundry"
        }));
        setTenants(mapped);
      })
      .finally(() => setLoading(false));

    // V4 Industry Templates (Sovereign Blueprints)
    supabase.from("v4_industry.laundry_template" as any).select("*").limit(6).then(({ data }: any) => {
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
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black">M</div>
            <div className="font-black tracking-tight">MJRH V4</div>
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
          <Badge variant="outline" className="rounded-full border-slate-200 uppercase tracking-widest text-red-600 font-black">Sovereign Business OS</Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-[0.9]">
            {t("home.heroTitlePlatform")}
          </h1>
          <p className="text-lg text-slate-600 leading-8 max-w-2xl mx-auto">
             {isAr ? 'منظومة تشغيل سيادية للمؤسسات الكبرى. تحويل الأنماط التشغيلية إلى جينات برمجية.' : 'Sovereign operating system for major enterprises. Transforming operational patterns into software DNA.'}
          </p>
        </section>

        <section id="active-projects-list" className="py-8">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-black">{t("home.activeProjectsTitle")}</h2>
            <span className="text-xs text-slate-500 font-mono">{tenants.length} Roots Active</span>
          </div>
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenants.map((tn) => (
                <Link key={tn.slug} to="/$slug" params={{ slug: tn.slug }} className="group">
                  <Card className="h-full border-2 hover:border-red-500 hover:shadow-xl transition-all rounded-3xl overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {tn.logo_url ? <img src={tn.logo_url} className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-black truncate text-lg uppercase tracking-tight">{tn.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">URN: {tn.slug}</div>
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
              <h2 className="text-2xl font-black flex items-center gap-2"><Store className="w-5 h-5 text-red-600" /> {t("home.marketplaceTitle")}</h2>
              <p className="text-sm text-slate-600 mt-1">{isAr ? 'قوالب جينية جاهزة للحقن الفوري' : 'Genetic templates ready for instant injection'}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map((tpl: any) => (
              <div key={tpl.id} className="rounded-3xl border-2 bg-slate-50 p-6 hover:shadow-md transition group">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-red-600 text-white flex items-center justify-center text-xl shadow-lg shadow-red-900/20">DNA</div>
                  <div>
                    <div className="font-black text-sm uppercase tracking-tight">{tpl.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">{tpl.value_stream_config?.activities?.length || 0} Sovereign Activities</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-1 flex-wrap">
                    {tpl.value_stream_config?.activities?.slice(0,4).map((s:any,i:number) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-white border border-slate-200 font-bold text-slate-600 uppercase tracking-tighter">{s.name}</span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

const isAr = true; // Fallback check for manual labels
