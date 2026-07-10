import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, Building2, Factory, Hotel, Hospital, Utensils, Boxes, Shield, Zap, Layers, Globe, Users, Store, Download } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({ meta: [{ title: "MJRH — Industrial Revolution" }] }),
  component: LandingPage,
});

function LandingPage() {
  const { t, dir } = useI18n();
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("workflow_templates").select("*").eq("is_active", true).eq("is_featured", true).limit(6).then(({ data }) => {
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
              <a href="#platform" className="hover:text-slate-900">المنصة</a>
              <a href="#solutions" className="hover:text-slate-900">الحلول</a>
              <a href="#enterprise" className="hover:text-slate-900">للمؤسسات</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex"><Link to="/login">دخول</Link></Button>
            <Button asChild size="sm" className="bg-slate-900 hover:bg-black text-white rounded-full px-5">
              <Link to="/login">ابدأ الآن</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* HERO - Clean, powerful, not wedding */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              منظومة تشغيل للمشاريع من 1 إلى 500 فرع
            </div>

            <h1 className="text-[40px] md:text-[56px] font-black tracking-[-0.03em] leading-[0.95]">
              نظام واحد
              <span className="block text-slate-400">يشغّل كل فروعك</span>
            </h1>

            <p className="text-[17px] leading-8 text-slate-600 max-w-[48ch]">
              MJRH مصممة للمؤسسات الكبرى. فندق 7 نجوم، مستشفى، سلسلة مطاعم 50 فرع — نفس المنصة، تقارير مجمعة، تخصيص كامل لكل فرع بدون كود.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-slate-900 hover:bg-black h-12 px-7">
                <Link to="/">استكشاف المشاريع <ArrowLeft className="w-4 h-4 ms-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-6">
                <Link to="/login">دخول المنصة</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-2"><Hotel className="w-3.5 h-3.5" /> فنادق</span>
              <span className="flex items-center gap-2"><Hospital className="w-3.5 h-3.5" /> مستشفيات</span>
              <span className="flex items-center gap-2"><Utensils className="w-3.5 h-3.5" /> سلاسل مطاعم</span>
              <span className="flex items-center gap-2"><Factory className="w-3.5 h-3.5" /> مصانع</span>
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
                  <div className="font-bold text-sm">Enterprise Core</div>
                  <Badge variant="outline" className="text-[10px]">Live</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xl font-black">50+</div><div className="text-[10px] text-slate-500">فرع</div></div>
                  <div className="border-x"><div className="text-xl font-black">Multi</div><div className="text-[10px] text-slate-500">شركات</div></div>
                  <div><div className="text-xl font-black">∞</div><div className="text-[10px] text-slate-500">تخصيص</div></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* TRUSTED STRIP */}
        <section className="py-8 border-y border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-6 text-sm">
            <span className="text-slate-400 font-medium">يعمل بكفاءة مع</span>
            <div className="flex flex-wrap gap-8 font-bold text-slate-700">
              <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> فنادق 7 نجوم</span>
              <span className="flex items-center gap-2"><Hospital className="w-4 h-4" /> مستشفيات</span>
              <span className="flex items-center gap-2"><Utensils className="w-4 h-4" /> سلاسل مطاعم</span>
              <span className="flex items-center gap-2"><Boxes className="w-4 h-4" /> مصانع وورش</span>
            </div>
          </div>
        </section>

        {/* MARKETPLACE PREVIEW - Public Templates visible on landing */}
        <section className="py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2"><Store className="w-5 h-5" /> قوالب جاهزة — ابدأ في دقائق</h2>
              <p className="text-sm text-slate-600 mt-1">اختر قالب نشاطك الجاهز — مغسلة، ورشة، غسيل سيارات، مطعم — وطبقه بضغطة</p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full"><Link to="/marketplace">عرض السوق <ArrowLeft className="w-3 h-3 ms-1" /></Link></Button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map((tpl: any) => (
              <Card key={tpl.id} className="hover:shadow-lg transition-all border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl">{tpl.icon}</div>
                    <div>
                      <div className="font-bold text-sm">{tpl.name}</div>
                      <div className="text-[11px] text-slate-500">{tpl.category} • {tpl.stages?.length} مراحل</div>
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

        {/* FEATURES - Minimal, clean */}
        <section id="platform" className="py-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight">كل أدوات التشغيل. مكان واحد.</h2>
            <p className="text-slate-600 mt-3">بدون تعقيد. بدون قوالب بلدي. مجرد نظام يعمل.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            <Feature icon={<Layers />} title="مراحل مخصصة" desc="كل مشروع يعرّف مراحله: استقبال، تشخيص، تشغيل، جودة، تسليم." />
            <Feature icon={<Users />} title="فريق وصلاحيات" desc="مندوب، فني، مدير فرع، مالك — كل واحد يشوف فرعه فقط." />
            <Feature icon={<Shield />} title="خزنة ومحاسبة" desc="قيود مزدوجة تلقائية، خزن منفصلة لكل فرع، إقفال يومي." />
            <Feature icon={<Globe />} title="متعدد الفروع" desc="فرع واحد أو 500 فرع — نفس الكود، تقارير مجمعة للمالك." />
            <Feature icon={<Zap />} title="توزيع ذكي" desc="الحضور والانصراف يحدد التوزيع، لا مجال للوساطة." />
            <Feature icon={<Boxes />} title="مخزون وخدمات" desc="كتالوج خدمات بفئات مخصصة وحقول إضافية لكل نشاط." />
          </div>
        </section>

        {/* ENTERPRISE */}
        <section id="enterprise" className="py-16">
          <Card className="bg-slate-900 text-white border-0 rounded-[2rem] overflow-hidden">
            <CardContent className="p-8 md:p-10 grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-5">
                <Badge className="bg-white/10 text-white border-white/20">للمؤسسات</Badge>
                <h3 className="text-3xl font-black leading-tight">من مغسلة واحدة<br/>إلى مؤسسة 500 فرع</h3>
                <p className="text-white/60 leading-7">نواة واحدة، تخصيص لا نهائي. كل شركة لها custom_config و custom_fields و workflow خاص بدون تعديل الكود الأساسي.</p>
                <ul className="space-y-2 text-sm">
                  <Li>شركة قابضة → مشاريع → فروع بمناطق</Li>
                  <Li>تقارير مجمعة: إيرادات كل الفروع في View واحد</Li>
                  <Li>حقول مخصصة: رقم غرفة، رقم ملف مريض، رقم طاولة</Li>
                  <Li>RLS أمني على مستوى الفرع والشركة</Li>
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
          <h2 className="text-3xl font-black">جاهز؟</h2>
          <p className="text-slate-600 mt-2">نفس المنصة تشغّل مغسلة صغيرة وفندق 7 نجوم. الفرق فقط في القالب.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-slate-900 h-12 px-8"><Link to="/">استكشاف</Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12"><Link to="/login">دخول</Link></Button>
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
              <Link to="/privacy" className="hover:text-slate-900">الخصوصية</Link>
              <Link to="/terms" className="hover:text-slate-900">الشروط</Link>
              <Link to="/login" className="hover:text-slate-900 font-bold">دخول</Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>Enterprise OS for Hotels, Hospitals, 50+ Chains</div>
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
