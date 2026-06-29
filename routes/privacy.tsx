import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "سياسة الخصوصية - MJRH" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <main className="min-h-screen bg-slate-50 p-4" dir="rtl"><Card className="max-w-3xl mx-auto"><CardContent className="p-8 space-y-4 leading-8"><h1 className="text-3xl font-black">سياسة الخصوصية</h1><p>يجمع MJRH البيانات اللازمة لتشغيل المغسلة مثل بيانات العملاء والطلبات والموظفين والمدفوعات والتقارير.</p><p>لا يتم بيع بيانات العملاء. تستخدم البيانات فقط لتقديم الخدمة، التتبع، التقارير، الدعم، وتحسين التشغيل.</p><p>يجب على صاحب المغسلة حماية حساباته وكلمات المرور، وتحديد صلاحيات الموظفين حسب دورهم.</p><p>رسائل WhatsApp في الوضع الحالي تفتح تطبيق واتساب برسالة جاهزة ويرسلها الموظف يدويًا.</p><p>لأي طلب حذف أو تصحيح بيانات، تواصل مع إدارة المغسلة أو مسؤول النظام.</p><Link to="/landing" className="text-teal-700 underline">العودة</Link></CardContent></Card></main>;
}
