import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ArrowLeft, BarChart3, Calculator, CheckCircle2, ClipboardList, Map, ShieldCheck, Shirt, Sparkles, Truck, Users, WalletCards } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({ meta: [{ title: "MJRH — نظام تشغيل المغاسل" }] }),
  component: LandingPage,
});

const features = [
  { title: "رحلة طلب كاملة", text: "من الاستقبال حتى التسليم مع كل حدث ظاهر في رحلة الطلب.", icon: <ClipboardList className="w-5 h-5" /> },
  { title: "محطات تشغيل حقيقية", text: "استقبال، غسيل، تجفيف وتجميع، كي، تغليف، QC، مناديب.", icon: <Sparkles className="w-5 h-5" /> },
  { title: "توزيع كي حسب الحضور", text: "التوزيع يتم على فنيي الكي الحاضرين فقط وبحساب يومية واضح.", icon: <Shirt className="w-5 h-5" /> },
  { title: "خريطة ومناديب", text: "استلام وتوصيل ومواقع وخط سير وسبب واضح لو التوزيع لم يتم.", icon: <Map className="w-5 h-5" /> },
  { title: "محاسبة وخزن", text: "حركات خزنة وقيود تلقائية ومصروفات ورواتب وإقفال يومي.", icon: <Calculator className="w-5 h-5" /> },
  { title: "بوابة عميل", text: "طلب من البيت، تتبع الطلب، رفع إثبات دفع InstaPay.", icon: <Users className="w-5 h-5" /> },
  { title: "APDO وفحص نظام", text: "كل عملية تجاوب: مين عمل؟ إيه البيانات؟ إيه الناتج؟ وهل لها قيد/خزنة/إشعار؟", icon: <ShieldCheck className="w-5 h-5" /> },
  { title: "جاهز للمغاسل الجديدة", text: "أي مغسلة جديدة تحصل تلقائيًا على الفروع، الخزن، الحسابات، الكتالوج والميزات.", icon: <CheckCircle2 className="w-5 h-5" /> },
];

const steps = ["أنشئ مغسلة", "أضف موظفين وفروع", "سجل طلب", "شغّل المحطات", "حصّل ووصّل", "أقفل الخزنة وشاهد التقارير"];

function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#99f6e4,transparent_28rem),radial-gradient(circle_at_bottom_left,#ddd6fe,transparent_30rem),linear-gradient(135deg,#f8fafc,#eef2ff)]" dir="rtl">
      <header className="mx-auto max-w-7xl px-4 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-700 via-cyan-500 to-teal-400 text-white flex items-center justify-center font-black shadow-lg">MJ</div>
          <div>
            <div className="font-black text-xl">MJRH</div>
            <div className="text-xs text-slate-500">Industrial Revolution for Laundry Operations</div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <LanguageSwitcher compact />
          <Button asChild variant="outline"><Link to="/login">دخول النظام</Link></Button>
          <Button asChild><a href="https://wa.me/201130804784" target="_blank" rel="noreferrer">طلب تجربة</a></Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16">
        <section className="grid lg:grid-cols-[1.1fr_.9fr] gap-8 items-center py-10 md:py-16">
          <div className="space-y-6">
            <Badge className="bg-teal-600 text-white px-3 py-1">SaaS لإدارة وتشغيل المغاسل</Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-950 leading-tight">
              نظام واحد يشغّل المغسلة من أول قطعة لحد آخر جنيه.
            </h1>
            <p className="text-lg text-slate-600 leading-8 max-w-2xl">
              MJRH ليس برنامج طلبات فقط؛ هو منظومة تشغيل تشمل الطلبات، المحطات، المناديب، بوابة العميل، الخزن، القيود، التقارير، والتنبيهات الذكية.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><a href="https://wa.me/201130804784?text=عايز%20تجربة%20MJRH" target="_blank" rel="noreferrer">احجز تجربة مباشرة <ArrowLeft className="w-4 h-4" /></a></Button>
              <Button asChild size="lg" variant="outline"><a href="/customer-portal?tenant=dry-tech">جرّب بوابة العميل</a></Button>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              {steps.map((s, i) => <span key={s} className="rounded-full border bg-white/70 px-3 py-1">{i + 1}. {s}</span>)}
            </div>
          </div>

          <Card className="border-0 shadow-2xl bg-slate-950 text-white overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-3xl bg-gradient-to-br from-teal-500/30 to-violet-600/30 border border-white/10 p-5">
                <div className="text-sm text-teal-100">جاهزية العمل الآن</div>
                <div className="text-6xl font-black mt-2">100%</div>
                <div className="text-xs text-white/60 mt-2">فحص APDO، الماليات، المحطات، المناديب، وواتساب.</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Mini icon={<Truck />} title="مناديب" value="خريطة + توزيع" />
                <Mini icon={<WalletCards />} title="خزن" value="إقفال يومي" />
                <Mini icon={<BarChart3 />} title="تقارير" value="تشغيل ومالية" />
                <Mini icon={<ShieldCheck />} title="APDO" value="رقابة كاملة" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black">كل أدوات التشغيل في مكان واحد</h2>
            <p className="text-slate-600 mt-2">مصمم حول سير عمل المغسلة الحقيقي وليس مجرد CRUD.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => <Card key={f.title} className="bg-white/80 backdrop-blur"><CardContent className="p-5 space-y-3"><div className="h-11 w-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">{f.icon}</div><div className="font-black">{f.title}</div><p className="text-sm text-slate-600 leading-6">{f.text}</p></CardContent></Card>)}
          </div>
        </section>

        <section className="py-8 grid lg:grid-cols-3 gap-4">
          <Plan title="Pilot" price="تجربة" lines={["مغسلة واحدة", "تشغيل فعلي", "تدريب أولي", "دعم مباشر"]} />
          <Plan title="Growth" price="اشتراك شهري" highlight lines={["فروع متعددة", "محاسبة وخزن", "بوابة عميل", "تقارير وتشغيل يومي"]} />
          <Plan title="Enterprise" price="اتفاق خاص" lines={["تخصيص", "تكاملات", "تدريب موسع", "دعم أولوية"]} />
        </section>

        <footer className="py-8 text-center text-sm text-slate-500">
          <div>© {new Date().getFullYear()} MJRH INDUSTRIAL REVOLUTION — BY MUHAMMAD RIYAD</div>
          <div className="mt-2 flex justify-center gap-4"><Link to="/privacy">الخصوصية</Link><Link to="/terms">الشروط</Link><Link to="/login">دخول النظام</Link></div>
        </footer>
      </main>
    </div>
  );
}

function Mini({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return <div className="rounded-2xl bg-white/8 border border-white/10 p-4"><div className="text-teal-200 [&_svg]:w-5 [&_svg]:h-5">{icon}</div><div className="font-black mt-2">{title}</div><div className="text-xs text-white/60">{value}</div></div>;
}

function Plan({ title, price, lines, highlight = false }: { title: string; price: string; lines: string[]; highlight?: boolean }) {
  return <Card className={highlight ? "border-teal-300 bg-teal-50 shadow-xl" : "bg-white/80"}><CardContent className="p-6 space-y-4"><div className="flex items-center justify-between"><div className="font-black text-xl">{title}</div>{highlight && <Badge className="bg-teal-600">الأكثر طلبًا</Badge>}</div><div className="text-3xl font-black">{price}</div><ul className="space-y-2 text-sm text-slate-600">{lines.map((l) => <li key={l} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5" />{l}</li>)}</ul></CardContent></Card>;
}
