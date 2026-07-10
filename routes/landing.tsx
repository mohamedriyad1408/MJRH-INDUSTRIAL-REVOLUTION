import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, BarChart3, Calculator, CheckCircle2, ClipboardList, Map, ShieldCheck, Shirt, Sparkles, Truck, Users, WalletCards } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({ meta: [{ title: "MJRH — منظومة تشغيل المشاريع" }] }),
  component: LandingPage,
});

const featureDefs = [
  { titleKey: "landing.f1Title", textKey: "landing.f1Text", icon: <ClipboardList className="w-5 h-5" /> },
  { titleKey: "landing.f2Title", textKey: "landing.f2Text", icon: <Sparkles className="w-5 h-5" /> },
  { titleKey: "landing.f3Title", textKey: "landing.f3Text", icon: <Shirt className="w-5 h-5" /> },
  { titleKey: "landing.f4Title", textKey: "landing.f4Text", icon: <Map className="w-5 h-5" /> },
  { titleKey: "landing.f5Title", textKey: "landing.f5Text", icon: <Calculator className="w-5 h-5" /> },
  { titleKey: "landing.f6Title", textKey: "landing.f6Text", icon: <Users className="w-5 h-5" /> },
  { titleKey: "landing.f7Title", textKey: "landing.f7Text", icon: <ShieldCheck className="w-5 h-5" /> },
  { titleKey: "landing.f8Title", textKey: "landing.f8Text", icon: <CheckCircle2 className="w-5 h-5" /> },
];
function LandingPage() {
  const { t, dir } = useI18n();
  const steps = ["landing.step1", "landing.step2", "landing.step3", "landing.step4", "landing.step5", "landing.step6"];
  const features = featureDefs.map((f) => ({ ...f, title: t(f.titleKey), text: t(f.textKey) }));
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#99f6e4,transparent_28rem),radial-gradient(circle_at_bottom_left,#ddd6fe,transparent_30rem),linear-gradient(135deg,#f8fafc,#eef2ff)]" dir={dir}>
      <header className="mx-auto max-w-7xl px-4 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white p-1 shadow-md border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/mjrh-logo.png" alt="MJRH Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-black text-xl text-slate-900 tracking-tight">MJRH</div>
            <div className="text-xs text-slate-500 font-semibold">Industrial Revolution — Project Operations Platform</div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <LanguageSwitcher compact />
          <Button asChild variant="outline"><Link to="/login">{t("landing.login")}</Link></Button>
          <Button asChild><a href="https://wa.me/201130804784" target="_blank" rel="noreferrer">{t("landing.requestDemo")}</a></Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16">
        <section className="grid lg:grid-cols-[1.1fr_.9fr] gap-8 items-center py-8 md:py-14">
          <div className="space-y-6">
            <div className="mb-4 flex items-center gap-4">
              <img src="/mjrh-logo.png" alt="MJRH INDUSTRIAL REVOLUTION" className="h-20 object-contain drop-shadow-xl" />
              <img src="/hero-workflow.png" alt="Industrial Workflow" className="h-20 object-contain hidden sm:block opacity-80" />
            </div>
            <Badge className="bg-teal-600 text-white px-3 py-1 font-bold shadow-xs">{t("landing.badge")}</Badge>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">🏨 فنادق 7 نجوم</Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">🏥 مستشفيات كبرى</Badge>
              <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-200">🍽️ سلاسل +50 فرع</Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">🏢 شركات متعددة المواقع</Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-950 leading-tight">
              {t("landing.heroTitle")}
            </h1>
            <p className="text-lg text-slate-600 leading-8 max-w-2xl">
              {t("landing.heroText")}
            </p>
            <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-teal-900 text-white p-4 flex items-center gap-3">
              <div className="text-2xl">🏗️</div>
              <div className="text-sm leading-6">
                <span className="font-black text-teal-200">نواة الشركات (Enterprise Core):</span> نظام متعدد الشركات والفروع، كل شركة لها فروعها، خزنها، موظفوها، وقابلية للتخصيص الكامل حسب احتياجات العميل — من مغسلة واحدة إلى سلسلة 50+ فرع.
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><a href="https://wa.me/201130804784?text=عايز%20تجربة%20MJRH%20Enterprise" target="_blank" rel="noreferrer">{t("landing.ctaDemo")} <ArrowLeft className="w-4 h-4" /></a></Button>
              <Button asChild size="lg" variant="outline"><a href="/customer-portal?tenant=dry-tech">{t("landing.ctaPortal")}</a></Button>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              {steps.map((s, i) => <span key={s} className="rounded-full border bg-white/70 px-3 py-1">{i + 1}. {t(s)}</span>)}
            </div>
          </div>

          <Card className="border-0 shadow-2xl bg-slate-950 text-white overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-3xl bg-gradient-to-br from-teal-500/30 to-violet-600/30 border border-white/10 p-5">
                <div className="text-sm text-teal-100">{t("landing.readiness")}</div>
                <div className="text-6xl font-black mt-2">100%</div>
                <div className="text-xs text-white/60 mt-2">{t("landing.readinessText")}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Mini icon={<Truck />} title={t("nav./stations/delivery")} value={t("landing.f4Text")} />
                <Mini icon={<WalletCards />} title={t("landing.cash")} value={t("landing.cashText")} />
                <Mini icon={<BarChart3 />} title={t("landing.reports")} value={t("landing.reportsText")} />
                <Mini icon={<ShieldCheck />} title="APDO" value={t("landing.apdoText")} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black">{t("landing.toolsTitle")}</h2>
            <p className="text-slate-600 mt-2">{t("landing.toolsText")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => <Card key={f.title} className="bg-white/80 backdrop-blur"><CardContent className="p-5 space-y-3"><div className="h-11 w-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">{f.icon}</div><div className="font-black">{f.title}</div><p className="text-sm text-slate-600 leading-6">{f.text}</p></CardContent></Card>)}
          </div>
        </section>

        <section className="py-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black">جاهز من مغسلة واحدة إلى مؤسسة 50+ فرع</h2>
            <p className="text-slate-600 mt-2">نفس المنصة، نفس الكود — من مشروع صغير إلى تشغيل فنادق 7 نجوم ومستشفيات كبرى</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Plan title="Pilot" price={t("landing.planPilot")} popularLabel={t("landing.popular")} lines={["مشروع واحد، فرع واحد", "500 عملية/شهر", "تشغيل مباشر", "تدريب أولي"]} />
            <Plan title="Growth" price={t("landing.planGrowth")} popularLabel={t("landing.popular")} highlight lines={["حتى 10 فروع", "3000 عملية/شهر", `${t("landing.cash")} + ${t("landing.reports")}`, "بوابة عملاء + خريطة"]} />
            <Plan title="Enterprise" price={t("landing.planEnterprise")} popularLabel={t("landing.popular")} lines={["50+ فرع، شركات متعددة", "فنادق 7 نجوم ومستشفيات", "سلاسل مطاعم + API", "تخصيص كامل حسب العميل"]} />
          </div>
        </section>

        <section className="py-8">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 text-white overflow-hidden">
            <CardContent className="p-6 grid md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-xl font-black mb-2">🏗️ نواة الشركات — قابلة للتطور والتفصيل</h3>
                <p className="text-sm text-white/70 leading-6">
                  عندنا نواة شركات (Enterprise Core) تدعم: شركة أم → فروع متعددة → خزن منفصلة → موظفين بصلاحيات مختلفة → تقارير مجمعة للمالك فقط. كل عميل كبير (فندق، مستشفى، سلسلة مطاعم) نقدر نفصّل له الـ Workflow والحقول والتقارير حسب احتياجاته بدون ما نكسر المنصة.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="bg-white/10 text-teal-200 border-white/20">Multi-Company</Badge>
                  <Badge className="bg-white/10 text-violet-200 border-white/20">50+ Branches</Badge>
                  <Badge className="bg-white/10 text-amber-200 border-white/20">Custom Fields</Badge>
                  <Badge className="bg-white/10 text-blue-200 border-white/20">Custom Workflow</Badge>
                  <Badge className="bg-white/10 text-emerald-200 border-white/20">Central Reports</Badge>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4">
                <img src="/hero-workflow.png" alt="Enterprise Workflow" className="w-full object-contain" />
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="py-8 text-center text-sm text-slate-500 space-y-2 font-medium">
          <div className="flex items-center justify-center gap-2">
            <img src="/mjrh-logo.png" alt="MJRH" className="h-6 w-6 object-contain" />
            <span className="font-black text-slate-900 tracking-wide">© {new Date().getFullYear()} MJRH INDUSTRIAL REVOLUTION</span>
          </div>
          <div className="font-semibold text-slate-500">BY MUHAMMAD RIYAD</div>
          <div className="mt-2 flex justify-center gap-4"><Link to="/privacy" className="hover:underline">{t("legal.privacyTitle")}</Link><Link to="/terms" className="hover:underline">{t("legal.termsTitle")}</Link><Link to="/login" className="hover:underline font-bold text-slate-700">{t("landing.login")}</Link></div>
        </footer>
      </main>
    </div>
  );
}

function Mini({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return <div className="rounded-2xl bg-white/8 border border-white/10 p-4"><div className="text-teal-200 [&_svg]:w-5 [&_svg]:h-5">{icon}</div><div className="font-black mt-2">{title}</div><div className="text-xs text-white/60">{value}</div></div>;
}

function Plan({ title, price, lines, highlight = false, popularLabel }: { title: string; price: string; lines: string[]; highlight?: boolean; popularLabel: string }) {
  return <Card className={highlight ? "border-teal-300 bg-teal-50 shadow-xl" : "bg-white/80"}><CardContent className="p-6 space-y-4"><div className="flex items-center justify-between"><div className="font-black text-xl">{title}</div>{highlight && <Badge className="bg-teal-600">{popularLabel}</Badge>}</div><div className="text-3xl font-black">{price}</div><ul className="space-y-2 text-sm text-slate-600">{lines.map((l) => <li key={l} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5" />{l}</li>)}</ul></CardContent></Card>;
}
