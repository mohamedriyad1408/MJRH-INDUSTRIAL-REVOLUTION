import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Workflow, FormInput, BarChart3, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/platform-builder")({
  head: () => ({ meta: [{ title: "Platform Builder — منصة بناء المنصات" }] }),
  component: PlatformBuilderPage,
});

function PlatformBuilderPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-black flex items-center gap-2"><Sparkles className="w-7 h-7 text-teal-600" /> Platform Builder — لوحة تحكم موحدة</h1>
        <p className="text-sm text-muted-foreground mt-2">يجمع التلاتة كخطوات متتالية: 1. عرّف سير العمل → 2. عرّف حقول كل مرحلة → 3. ابنِ التقارير اللي محتاجها — لو قدرت تجيب حد غير تقني يبني نشاط جديد بالكامل لوحده بدون ما يسألك سؤال واحد، يبقى وصلت للهدف.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-2 hover:border-slate-900 transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Workflow className="w-5 h-5 text-teal-600" /> 1. Workflow Builder</CardTitle>
            <CardDescription className="text-xs">عرّف سير العمل — مراحل، أدوار، SLA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs leading-6">
              • مدير غير تقني ينشئ مرحلة من الواجهة<br />
              • بدون كود، بدون كسر المغسلة<br />
              • Snapshot يحفظ نسخة لكل طلب مفتوح<br />
              • Whitelist أمان إلزامي
            </div>
            <Button asChild className="w-full"><Link to="/admin/workflow-builder">افتح Builder <ArrowRight className="w-4 h-4 ms-2" /></Link></Button>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[10px]">dnd-kit مجاني</Badge>
              <Badge variant="outline" className="text-[10px]">Feature Flag v1/v2</Badge>
              <Badge className="bg-emerald-600 text-white text-[10px]">Done Phase 1</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-slate-900 transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FormInput className="w-5 h-5 text-blue-600" /> 2. Input Builder</CardTitle>
            <CardDescription className="text-xs">عرّف حقول كل مرحلة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs leading-6">
              • Manual, QR/Barcode (html5-qrcode), Photo, CSV (papaparse), Webhook (pms-bridge), Signature<br />
              • Preview حي مثل Google Forms<br />
              • Size limit للـ Storage المجاني<br />
              • Whitelist validation إلزامي
            </div>
            <Button asChild className="w-full"><Link to="/admin/input-builder">افتح Builder <ArrowRight className="w-4 h-4 ms-2" /></Link></Button>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[10px]">html5-qrcode</Badge>
              <Badge variant="outline" className="text-[10px]">papaparse</Badge>
              <Badge variant="outline" className="text-[10px]">signature_pad</Badge>
              <Badge className="bg-emerald-600 text-white text-[10px]">Done v3.1</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-slate-900 transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-600" /> 3. Output Builder</CardTitle>
            <CardDescription className="text-xs">ابنِ التقارير والـ Dashboards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs leading-6">
              • مصدر بأسماء مفهومة (مش أسماء جداول)<br />
              • أعمدة + فلاتر + Group By + Chart<br />
              • Export PDF (jsPDF) + CSV Excel-compatible<br />
              • جدولة pg_cron + whatsapp_queue
            </div>
            <Button asChild className="w-full"><Link to="/admin/report-builder">افتح Builder <ArrowRight className="w-4 h-4 ms-2" /></Link></Button>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[10px]">jsPDF</Badge>
              <Badge variant="outline" className="text-[10px]">CSV Excel</Badge>
              <Badge variant="outline" className="text-[10px]">pg_cron مجاني</Badge>
              <Badge className="bg-emerald-600 text-white text-[10px]">Done v3.1</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 text-white border-0">
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> الربط بين الطبقات التلاتة</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm leading-7">
          <div>• كل <code>workflow_stage</code> بيعرض بس الـ <code>field_definitions_v2</code> المرتبطة بيه (applies_to_stage_id)</div>
          <div>• كل <code>report_definition</code> يقدر يستخدم أي حقل من <code>field_values</code> بغض النظر عن أي workflow أنشأه — تقرير موحد عبر أنشطة مختلفة (مغسلة + فندق) لو التينانت شغال بالاتنين</div>
          <div>• لوحة التحكم الموحدة دي تجمع التلاتة كخطوات متتالية: 1 → 2 → 3</div>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-4 text-sm">
          <b>معيار النجاح النهائي:</b> لو قدرت تجيب حد غير تقني (مش إنت ولا المطور) يقعد قدام الشاشة لوحده، ويبني نشاط جديد بالكامل (سير عمل + نماذج + تقرير) من غير ما يسألك سؤال واحد — يبقى وصلت للهدف. هذا هو اختبار E2E المقترح: تينانت جديد بالكامل يتبني من الواجهة فقط من الصفر، بدون تدخل مطور، خلال أقل من ساعة.
        </CardContent>
      </Card>
    </div>
  );
}
