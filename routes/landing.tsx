import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, BarChart3, Building2, CheckCircle2, ClipboardList, Factory, Hospital, Hotel, Map, ShieldCheck, Shirt, Sparkles, Truck, Users, Utensils, WalletCards, Workflow, Globe, Lock, Zap, Layers, Settings2, Boxes } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({ meta: [{ title: "MJRH — منظومة تشغيل المشاريع | Industrial Revolution" }] }),
  component: LandingPage,
});

const featureDefs = [
  { titleKey: "landing.f1Title", textKey: "landing.f1Text", icon: <ClipboardList className="w-5 h-5" /> },
  { titleKey: "landing.f2Title", textKey: "landing.f2Text", icon: <Workflow className="w-5 h-5" /> },
  { titleKey: "landing.f3Title", textKey: "landing.f3Text", icon: <Users className="w-5 h-5" /> },
  { titleKey: "landing.f4Title", textKey: "landing.f4Text", icon: <Map className="w-5 h-5" /> },
  { titleKey: "landing.f5Title", textKey: "landing.f5Text", icon: <WalletCards className="w-5 h-5" /> },
  { titleKey: "landing.f6Title", textKey: "landing.f6Text", icon: <Users className="w-5 h-5" /> },
  { titleKey: "landing.f7Title", textKey: "landing.f7Text", icon: <ShieldCheck className="w-5 h-5" /> },
  { titleKey: "landing.f8Title", textKey: "landing.f8Text", icon: <CheckCircle2 className="w-5 h-5" /> },
];

function LandingPage() {
  const { t, dir } = useI18n();
  const steps = ["landing.step1", "landing.step2", "landing.step3", "landing.step4", "landing.step5", "landing.step6"];
  const features = featureDefs.map((f) => ({ ...f, title: t(f.titleKey), text: t(f.textKey) }));

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 p-1.5 shadow-md flex items-center justify-center overflow-hidden">
              <img src="/icon-512.png" alt="MJRH" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="font-black text-lg text-slate-900 tracking-tight">MJRH</div>
              <div className="text-[10px] text-slate-500 font-bold tracking-widest">INDUSTRIAL REVOLUTION</div>
            </div>
            <Badge variant="outline" className="hidden sm:flex ml-2 bg-teal-50 text-teal-700 border-teal-200">Enterprise OS</Badge>
          </div>
          <div className="flex gap-2 items-center">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm"><Link to="/login">{t("landing.login")}</Link></Button>
            <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800"><a href="https://wa.me/201130804784" target="_blank" rel="noreferrer">{t("landing.requestDemo")}</a></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16">
        {/* HERO — Enterprise Grade, Oracle-like */}
        <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-8 items-center py-10 md:py-16">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-slate-900 text-white px-3 py-1">Built for Scale</Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">🏨 فنادق 7 نجوم</Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">🏥 مستشفيات كبرى</Badge>
              <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-200">🍽️ سلاسل +50 فرع</Badge>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
              منصة واحدة
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-violet-600">تشغّل أي مشروع</span>
              <span className="block text-3xl md:text-4xl mt-2">من أول عملية لحد إقفال الخزنة.</span>
            </h1>

            <p className="text-lg text-slate-600 leading-8 max-w-2xl font-medium">
              {t("landing.heroText")}
            </p>

            <div className="rounded-2xl bg-slate-900 text-white p-4 flex gap-3 items-start">
              <div className="h-10 w-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-teal-300" />
              </div>
              <div className="text-sm leading-6">
                <span className="font-black text-teal-200">Enterprise Core — نواة الشركات:</span> شركة قابضة → مشاريع/فنادق → فروع → خزن وموظفين بصلاحيات → تقارير مجمعة للمالك. قابلية تخصيص كاملة لكل عميل (Workflow, حقول, تقارير) بدون تعديل الكود الأساسي.
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 h-12 px-8 font-black">
                <a href="https://wa.me/201130804784?text=عايز%20عرض%20Enterprise%20للفنادق" target="_blank" rel="noreferrer">
                  عرض Enterprise للفنادق والمستشفيات <ArrowLeft className="w-4 h-4 ms-2" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link to="/login">دخول المنصة</Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {steps.map((s, i) => (
                <span key={s} className="rounded-full border bg-white px-3 py-1.5 font-bold text-slate-600 shadow-sm">
                  {i + 1}. {t(s)}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-0 shadow-2xl overflow-hidden">
              <div className="bg-white p-4">
                <img src="/hero-workflow.png" alt="Enterprise Workflow - Factory to Delivery" className="w-full object-contain" />
              </div>
              <CardContent className="p-0">
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t">
                  <div className="p-4 text-center">
                    <div className="text-2xl font-black text-slate-900">50+</div>
                    <div className="text-[10px] text-slate-500 font-bold">فرع لكل مؤسسة</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-2xl font-black text-teal-600">100%</div>
                    <div className="text-[10px] text-slate-500 font-bold">جاهزية تشغيل</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-2xl font-black text-violet-600">∞</div>
                    <div className="text-[10px] text-slate-500 font-bold">قابلية تخصيص</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-slate-900 text-white border-0 shadow-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-teal-300 mb-2"><Building2 className="w-4 h-4" /><span className="text-xs font-black">Multi-Company</span></div>
                  <div className="text-sm font-bold">شركة قابضة → 10 فنادق → كل فندق 5 فروع → خزنة وتقارير لكل فرع + مجمعة</div>
                </CardContent>
              </Card>
              <Card className="bg-white border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-violet-600 mb-2"><Zap className="w-4 h-4" /><span className="text-xs font-black">Custom Workflow</span></div>
                  <div className="text-sm font-bold text-slate-700">كل عميل يعرّف مراحله: استقبال، تشخيص، صيانة، QC، تسليم...</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* TRUSTED BY - Enterprise */}
        <section className="py-6">
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm font-black text-slate-500">مصمم لـ:</div>
                <div className="flex flex-wrap gap-6 items-center text-sm font-bold text-slate-700">
                  <span className="flex items-center gap-2"><Hotel className="w-4 h-4 text-amber-600" /> فنادق 7 نجوم (غرف، مطاعم، مغسلة داخلية)</span>
                  <span className="flex items-center gap-2"><Hospital className="w-4 h-4 text-blue-600" /> مستشفيات (تعقيم، مغسلة طبية، مطبخ)</span>
                  <span className="flex items-center gap-2"><Utensils className="w-4 h-4 text-violet-600" /> سلاسل مطاعم 50+ فرع</span>
                  <span className="flex items-center gap-2"><Factory className="w-4 h-4 text-slate-600" /> مصانع وورش</span>
                  <span className="flex items-center gap-2"><Globe className="w-4 h-4 text-teal-600" /> شركات متعددة الدول</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FEATURES — Oracle-like power */}
        <section className="py-8">
          <div className="text-center mb-8 max-w-3xl mx-auto">
            <Badge className="bg-slate-900 text-white mb-3">Platform Power</Badge>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">{t("landing.toolsTitle")}</h2>
            <p className="text-slate-600 mt-3 leading-7">{t("landing.toolsText")} — نفس الكود يشغّل مغسلة صغيرة وفندق 7 نجوم.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <Card key={f.title} className="bg-white border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <CardContent className="p-5 space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">{f.icon}</div>
                  <div className="font-black text-base">{f.title}</div>
                  <p className="text-sm text-slate-600 leading-6">{f.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ENTERPRISE CORE DEEP DIVE */}
        <section className="py-8">
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Card className="border-0 shadow-2xl bg-slate-900 text-white overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/20 flex items-center justify-center"><Layers className="w-5 h-5 text-teal-300" /></div>
                  <h3 className="text-xl font-black">نواة الشركات — Enterprise Core</h3>
                </div>
                <p className="text-sm text-white/70 leading-7">
                  المنصة مبنية كنواة قابلة للتوسع: <span className="text-white font-bold">Enterprise → Tenants → Branches → Cash → Staff</span>. كل عميل كبير (فندق، مستشفى، سلسلة) له `enterprise_id`، وكل فرع له `region` و `branch_code` و `custom_config` JSONB للتخصيص بدون كود.
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" /><span><b>Scalable:</b> 1 شركة → 10 مشاريع → كل مشروع 50 فرع → إجمالي 500 فرع في نفس الـ DB مع RLS و indexes.</span></div>
                  <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5" /><span><b>Customizable:</b> `custom_field_definitions` لكل عميل (رقم غرفة، رقم ملف مريض، رقم طاولة...) + `custom_config` لكل فرع.</span></div>
                  <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5" /><span><b>Central Reporting:</b> `enterprise_branch_summary` VIEW تعطي إيرادات وطلبات كل الفروع مجمعة للمالك فقط.</span></div>
                  <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5" /><span><b>Secure:</b> RLS + `can_access_tenant` + `can_access_branch` + `enterprise_id` isolation.</span></div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge className="bg-white/10 border-white/20 text-teal-200">Multi-Company</Badge>
                  <Badge className="bg-white/10 border-white/20 text-violet-200">50+ Branches</Badge>
                  <Badge className="bg-white/10 border-white/20 text-amber-200">Custom Fields</Badge>
                  <Badge className="bg-white/10 border-white/20 text-blue-200">Custom Workflow</Badge>
                  <Badge className="bg-white/10 border-white/20 text-emerald-200">Central Reports</Badge>
                  <Badge className="bg-white/10 border-white/20 text-white">RLS + Security</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-white border shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-2 border-b flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600">ARCHITECTURE — Enterprise Scale</span>
                  <Badge variant="outline" className="text-[10px]">Oracle-like Power</Badge>
                </div>
                <div className="p-4">
                  <img src="/hero-workflow.png" alt="Enterprise Workflow Architecture" className="w-full object-contain" />
                </div>
                <CardContent className="p-4 bg-slate-50 text-xs leading-6 text-slate-600">
                  <div className="font-black text-slate-900 mb-1">كيف نفس الكود يشغّل مغسلة وفندق 7 نجوم؟</div>
                  نفس الجداول: `enterprises → tenants → branches (region, branch_code) → orders (enterprise_id, custom_fields) → cash → accounting`. الفرق فقط في `workflow_templates` و `custom_field_definitions` و `custom_config`.
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <Hotel className="w-5 h-5 text-amber-700 mb-2" />
                    <div className="font-black text-sm">فندق 7 نجوم</div>
                    <div className="text-xs text-slate-600 mt-1">10 مباني × 5 أقسام × 20 غرفة = 1000 وحدة تشغيلية يومياً</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <Hospital className="w-5 h-5 text-blue-700 mb-2" />
                    <div className="font-black text-sm">مستشفى كبير</div>
                    <div className="text-xs text-slate-600 mt-1">تعقيم، مغسلة طبية، مطبخ مركزي، صيانة أجهزة</div>
                  </CardContent>
                </Card>
                <Card className="bg-violet-50 border-violet-200">
                  <CardContent className="p-4">
                    <Utensils className="w-5 h-5 text-violet-700 mb-2" />
                    <div className="font-black text-sm">سلسلة مطاعم 50+ فرع</div>
                    <div className="text-xs text-slate-600 mt-1">طلبات، مخزون، خزنة، موظفين، تقارير مركزية</div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 text-white border-0">
                  <CardContent className="p-4">
                    <Boxes className="w-5 h-5 text-teal-300 mb-2" />
                    <div className="font-black text-sm">نفس الكود</div>
                    <div className="text-xs text-white/70 mt-1">من مغسلة واحدة إلى 500 فرع — بدون إعادة بناء</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="py-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black">نفس المنصة — من مغسلة إلى مؤسسة 50+ فرع</h2>
            <p className="text-slate-600 mt-2">نفس الكود، نفس الجودة — فقط القالب والفروع تختلف</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Plan title="Pilot" price={t("landing.planPilot")} popularLabel={t("landing.popular")} lines={["مشروع واحد، فرع واحد", "500 عملية/شهر", "تشغيل مباشر", "تدريب أولي"]} />
            <Plan title="Growth" price={t("landing.planGrowth")} popularLabel={t("landing.popular")} highlight lines={["حتى 10 فروع", "3000 عملية/شهر", `${t("landing.cash")} + ${t("landing.reports")}`, "بوابة عملاء + خريطة"]} />
            <Plan title="Enterprise" price={t("landing.planEnterprise")} popularLabel={t("landing.popular")} lines={["50+ فرع، شركات متعددة", "فنادق 7 نجوم ومستشفيات", "سلاسل مطاعم + API + Custom Fields", "تخصيص كامل حسب العميل + Onboarding"]} />
          </div>
        </section>

        <footer className="py-8 text-center text-sm text-slate-500 space-y-2 font-medium border-t mt-8">
          <div className="flex items-center justify-center gap-2">
            <img src="/icon-512.png" alt="MJRH" className="h-8 w-8 object-contain rounded-lg" />
            <span className="font-black text-slate-900 tracking-wide">© {new Date().getFullYear()} MJRH INDUSTRIAL REVOLUTION — Enterprise Operations OS</span>
          </div>
          <div className="font-semibold text-slate-500">BY MUHAMMAD RIYAD — Built for 7-star hotels, hospitals, 50+ branch chains</div>
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
  return <Card className={highlight ? "border-teal-300 bg-teal-50 shadow-xl scale-[1.02]" : "bg-white border shadow-sm"}><CardContent className="p-6 space-y-4"><div className="flex items-center justify-between"><div className="font-black text-xl">{title}</div>{highlight && <Badge className="bg-teal-600">{popularLabel}</Badge>}</div><div className="text-3xl font-black">{price}</div><ul className="space-y-2 text-sm text-slate-600">{lines.map((l) => <li key={l} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />{l}</li>)}</ul></CardContent></Card>;
}
