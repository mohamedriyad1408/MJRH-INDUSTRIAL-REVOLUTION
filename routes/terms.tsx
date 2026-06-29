import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "الشروط والأحكام - MJRH" }] }),
  component: TermsPage,
});

function TermsPage() {
  return <main className="min-h-screen bg-slate-50 p-4" dir="rtl"><Card className="max-w-3xl mx-auto"><CardContent className="p-8 space-y-4 leading-8"><h1 className="text-3xl font-black">الشروط والأحكام</h1><p>MJRH نظام لإدارة وتشغيل المغاسل، ويعتمد على إدخال صحيح للبيانات من صاحب المغسلة والموظفين.</p><p>المخرجات المالية والتقارير تعتمد على صحة العمليات المسجلة مثل التحصيلات، المصروفات، إقفال الخزن، والمرتجعات.</p><p>يجب مراجعة الإعدادات والضرائب والأسعار قبل التشغيل التجاري.</p><p>النظام يوفر أدوات متابعة وإصلاح، لكن الإدارة مسؤولة عن القرارات التشغيلية والمالية النهائية.</p><p>أي تكامل خارجي مثل WhatsApp Business API أو الطباعة الصامتة يحتاج إعدادًا منفصلًا.</p><Link to="/landing" className="text-teal-700 underline">العودة</Link></CardContent></Card></main>;
}
