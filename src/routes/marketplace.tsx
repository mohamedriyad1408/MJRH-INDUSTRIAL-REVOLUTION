import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, interpolate } from "@/lib/i18n";
import { Store, Star, ArrowLeft, Building2, Wrench, Car, Home, Utensils, Shirt } from "lucide-react";

export const Route = createFileRoute("/marketplace")({
  head: () => ({ meta: [{ title: "MJRH Marketplace" }] }),
  component: PublicMarketplacePage,
});

type Template = {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  stages: any[];
  is_featured: boolean;
  downloads: number;
};

const categoryIcons: Record<string, any> = {
  laundry: Shirt,
  carpet: Home,
  repair: Wrench,
  carwash: Car,
  cleaning: Home,
  restaurant: Utensils,
  general: Building2,
};

function PublicMarketplacePage() {
  const { dir, t, language } = useI18n();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    supabase.from("workflow_templates").select("*").eq("is_active", true).order("is_featured", { ascending: false }).order("downloads", { ascending: false }).then(({ data }: any) => {
      setTemplates((data ?? []) as Template[]);
      setLoading(false);
    });
  }, []);

  const categories = Array.from(new Set(templates.map(t => t.category))).filter(Boolean);
  const filtered = filter === "all" ? templates : templates.filter(t => t.category === filter);

  return (
    <div className="min-h-screen bg-white" dir={dir}>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="mx-auto max-w-6xl px-6 h-[64px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <img src="/icon-512.png" alt="MJRH" className="h-5 w-5 object-contain" />
            </div>
            <div className="font-black">MJRH</div>
            <Badge variant="outline" className="hidden sm:flex">Marketplace</Badge>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm"><Link to="/landing">{t("marketplace.platform")}</Link></Button>
            <Button asChild size="sm" className="rounded-full bg-slate-900"><Link to="/signup">{t("marketplace.startFree")}</Link></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Store className="w-5 h-5" /></div>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200">{t("marketplace.badge")}</Badge>
            <Badge variant="outline">{interpolate(t("marketplace.templateCount"), { count: templates.length })}</Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">
            {t("marketplace.title")}
            <span className="block text-slate-400">{t("marketplace.subtitle")}</span>
          </h1>
          <p className="text-slate-600 mt-4 leading-7 max-w-xl">
            {t("marketplace.description")}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setFilter("all")}>{t("marketplace.all")} ({templates.length})</Button>
          {categories.map(cat => {
            const Icon = categoryIcons[cat] || Building2;
            return (
              <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setFilter(cat)}>
                <Icon className="w-3.5 h-3.5 me-1" /> {cat}
              </Button>
            );
          })}
        </div>

        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(tpl => {
            const Icon = categoryIcons[tpl.category] || Building2;
            return (
              <Card key={tpl.id} className="hover:shadow-xl hover:-translate-y-1 transition-all border-0 shadow-sm bg-white overflow-hidden group">
                <div className="h-2 w-full" style={{ background: (tpl.stages?.[0] as any)?.color || "#0d9488" }} />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {tpl.icon}
                    </div>
                    <div className="flex gap-1">
                      {tpl.is_featured && <Badge className="bg-amber-500"><Star className="w-3 h-3" /></Badge>}
                      <Badge variant="secondary" className="text-[10px]">{interpolate(t("marketplace.usage"), { count: tpl.downloads })}</Badge>
                    </div>
                  </div>
                  <CardTitle className="mt-3">
                    <div className="font-black text-lg">{language === "en" && tpl.name_en ? tpl.name_en : tpl.name}</div>
                    <div className="text-xs font-normal text-slate-500 mt-1 flex items-center gap-1"><Icon className="w-3 h-3" /> {tpl.category} • {tpl.stages?.length} stages</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 leading-6 line-clamp-3">{tpl.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.stages?.slice(0, 4).map((s: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-slate-100 border text-slate-700">
                        <span>{s.icon}</span> {s.name}
                      </span>
                    ))}
                    {(tpl.stages?.length || 0) > 4 && <span className="text-xs text-slate-400">+{tpl.stages.length - 4}</span>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button asChild size="sm" className="flex-1 rounded-full bg-slate-900 hover:bg-black">
                      <Link to="/signup">{t("marketplace.useTemplate")} <ArrowLeft className="w-3 h-3 ms-1" /></Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link to="/landing">{t("marketplace.details")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-12 bg-slate-900 text-white border-0 rounded-[1.5rem] overflow-hidden">
          <CardContent className="p-8 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-black">{t("marketplace.customTitle")}</h3>
              <p className="text-white/60 mt-2 text-sm leading-6">{t("marketplace.customDesc")}</p>
              <Button asChild className="mt-4 bg-white text-slate-900 hover:bg-slate-100 rounded-full">
                <a href="https://wa.me/201130804784?text=custom%20template" target="_blank" rel="noreferrer">{t("marketplace.requestCustom")}</a>
              </Button>
            </div>
            <div className="bg-white rounded-2xl p-4">
              <img src="/hero-workflow.png" alt="Custom Workflow" className="w-full object-contain" />
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t mt-12 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <img src="/icon-512.png" alt="MJRH" className="h-5 w-5 object-contain" />
            </div>
            <div className="font-black">© {new Date().getFullYear()} MJRH INDUSTRIAL REVOLUTION</div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-slate-900">{t("landing.footerPrivacy")}</Link>
            <Link to="/terms" className="hover:text-slate-900">{t("landing.footerTerms")}</Link>
            <a href="tel:+201130804784" className="font-bold hover:text-slate-900">+20 113 080 4784</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
