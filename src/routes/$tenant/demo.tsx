import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, ShieldCheck, FileText, MapPin, TrendingUp, Calculator, Truck, Building2, ExternalLink, Download, Sparkles, CheckCircle2, Layers } from "lucide-react";

export const Route = createFileRoute("/$tenant/demo")({
  head: () => ({ meta: [{ title: "مرصد فيديو ديمو النظام وطلب التجمع الخامس - MJRH" }] }),
  component: SystemDemoShowcasePage,
});

function SystemDemoShowcasePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shrink-0">
            MJ
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>مرصد فيديو ديمو النظام وطلب التجمع الخامس</span>
              <Badge variant="outline" className="border-teal-500 text-teal-400 text-xs">v2.6 Hybrid</Badge>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              توثيق مرئي ومحاسبي حي لرحلة الطلب رقم <strong className="text-teal-400">#ORD-2026-995</strong> (د. شريف الألفي - التجمع الخامس) لإتمام صفقات البيع والتدريب الميداني.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/media/demo/mjrh-real-world-demo.mp4" download="mjrh-real-world-demo.mp4">
            <Button variant="default" className="bg-teal-600 hover:bg-teal-500 font-bold gap-2 text-xs md:text-sm">
              <Download className="w-4 h-4" />
              تحميل فيديو ديمو MP4 (6.3 ميجا)
            </Button>
          </a>
          <a href="/media/demo/player.html" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="border-slate-600 hover:bg-slate-800 font-bold gap-2 text-xs md:text-sm">
              <ExternalLink className="w-4 h-4 text-teal-400" />
              فتح محاكي شاشات الواجهة التفاعلي
            </Button>
          </a>
        </div>
      </div>

      {/* Main Video Player Card */}
      <Card className="bg-slate-900 border-slate-700 shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-800 bg-slate-950/60 p-4 md:p-6 flex flex-row justify-between items-center">
          <CardTitle className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-teal-400" />
            فيديو ديمو النظام الحقيقي (صوت إنجليزي مهني بنطق Majarrah دون تكرار وبدون إيموجيز)
          </CardTitle>
          <Badge className="bg-teal-950 text-teal-300 border border-teal-600">HD 1280x720 (15 FPS)</Badge>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner aspect-video flex items-center justify-center">
            <video
              controls
              className="w-full h-full object-cover"
              poster="/mjrh-logo.png"
            >
              <source src="/media/demo/mjrh-real-world-demo.mp4" type="video/mp4" />
              متصفحك لا يدعم تشغيل الفيديو المباشر. يمكنك تحميل الملف بالضغط على الزر بالأعلى.
            </video>
          </div>
          <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs text-slate-400 border-t border-slate-800 pt-3">
            <span>الهوية الصوتية: نطق الاسم بـ <strong className="text-white font-mono">Majarrah</strong> (مَجَرَّة = Galaxy) للإشارة للكون التشغيلي المتكامل.</span>
            <span>بيانات المالك التجريبي على النظام: <strong className="text-teal-400 font-mono">abdelnaser@mjrh.com</strong> (كلمة المرور: <strong className="font-mono text-amber-400">123234Naser</strong>)</span>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Section: Live Sales Order Details & 7 Stations Walkthrough */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Right: Fifth Settlement Live Sales Order Data */}
        <Card className="bg-slate-900 border-slate-700 shadow-xl flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-teal-400 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                بيانات الطلب الحي المسجل لبيع المنصة (ديمو التجمع الخامس)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs md:text-sm">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">رقم الطلب في قاعدة البيانات:</span>
                  <span className="font-mono font-bold text-white text-base">#ORD-2026-995</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">اسم العميل المسجل:</span>
                  <span className="font-bold text-amber-400">د. شريف الألفي (VIP Customer)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">رقم الهاتف المسجل:</span>
                  <span className="font-mono text-white">01000000995</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-slate-300">
                  <span className="text-teal-400 font-bold block mb-1">عنوان التوصيل (التجمع الخامس):</span>
                  فيلا 42، منطقة الشويفات، شارع التسعين الجنوبي، التجمع الخامس، القاهرة الجديدة
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-white text-xs">الأصناف الثلاثة المدرجة في خطوط الإنتاج:</div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">1. بدلة رجالي قطعتين دراي كلين</div>
                    <div className="text-[11px] text-slate-400">فئة: رجالي | خدمة: غسيل وكي (both)</div>
                  </div>
                  <span className="font-mono font-bold text-teal-400">250.00 ج.م</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-amber-600/50 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">2. فستان زفاف حريمي (قطعة معزولة للمعالجة)</div>
                    <div className="text-[11px] text-amber-400">فئة: حريمي | ملاحظة: معالجة بقعة زيت بالذيل بالمذيبات</div>
                  </div>
                  <span className="font-mono font-bold text-teal-400">600.00 ج.م</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">3. سجاد وموكيت شنواه (4×3)</div>
                    <div className="text-[11px] text-slate-400">فئة: سجاد وموكيت | خدمة: غسيل آلي آمن</div>
                  </div>
                  <span className="font-mono font-bold text-teal-400">350.00 ج.م</span>
                </div>
              </div>

              <div className="bg-teal-950/40 p-4 rounded-xl border border-teal-500/50 flex flex-col gap-2">
                <div className="flex justify-between items-center font-black text-sm md:text-base">
                  <span className="text-white">إجمالي المطالبة المستحقة:</span>
                  <span className="text-teal-400 font-mono">1,200.00 ج.م</span>
                </div>
                <div className="flex justify-between items-center text-xs text-amber-300">
                  <span>خيار الاستعجال:</span>
                  <span className="font-bold">توصيل مستعجل خلال 4 ساعات (is_urgent = true)</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300 pt-1 border-t border-teal-800/40">
                  <span>التحصيل الإلكتروني (InstaPay):</span>
                  <span>تحويل 1,250 ج.م ➔ تسديد 1,200 ج.م + فصل 50 ج.م تِبس للمندوب</span>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>Tenant UUID: c0ea27c7-138e-4d12-b732-6981bddb4c97</span>
            <span>RLS Active</span>
          </div>
        </Card>

        {/* Left: 7 Operational Stations Walkthrough */}
        <Card className="bg-slate-900 border-slate-700 shadow-xl flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-400" />
                تسلسل المحطات التشغيلية والرقابة الفورية (APDO Engine)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <div className="font-bold text-white">استقبال نقطة البيع (POS Intake & Editor)</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">اختيار من فئات اللمس السبعة النظيفة (بدون مطعم روليه)، إضافة الملاحظات وصور البقع في محرر الفاتورة المتقدم، وإصدار قيد استحقاق المبيعات آلياً.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <div className="font-bold text-white">محطة الفرز السريع (1-Click Fast Track Sorting)</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">تنفيذاً لقرار تعليق الباركود حالياً، يستخدم المشغل زر <code className="text-teal-300">fastTrackSortAll</code> لفرز وتوجيه القطع بضغطة واحدة وتخصيص التكلفة التقديرية (COGS).</p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-amber-900/40 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <div className="font-bold text-amber-300">محطة الغسيل وعزل البقع (Cleaning & Quarantine)</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">اعتماد الأحمال العادية جماعياً، وعزل فستان الزفاف بالزر <code className="text-amber-300">quarantinePiece</code> لمعالجته بالمذيبات دون تعطيل البدلة والسجاد، مع قيد استنفاد المخزون الكيميائي.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  <div className="font-bold text-white">محطة الكي العادل ومبدأ وحدة الطلب (Fairness Ironing)</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">تطبيق القواعد الخمسة الحصرية لدالة <code className="text-teal-300">rebalance_ironing_assignments</code>: تخصيص الطلب كاملاً لفني واحد (أحمد محمود)، حماية الفنيين من الاحتراق (قفل ➔40 قطعة)، واحتساب الأجر الإنتاجي بالقطعة.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">5</span>
                <div>
                  <div className="font-bold text-white">الجودة والتغليف وإشعار WhatsApp (QC & Packing)</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">فحص المطابقة، الضغط على زر <code className="text-teal-300">fastTrackPackAndReady</code> لنقل الطلب لحالة جاهز، وتجهيز إشعار WhatsApp التلقائي للعميل (1,200 ج.م) بدون رسوم API خارجية.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">6</span>
                <div>
                  <div className="font-bold text-white">خريطة التجمع الخامس وتحصيل InstaPay وفصل التبس</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">توجيه المندوب عبر شارع التسعين الجنوبي لفيلا 42 بالشويفات، تأكيد التسليم، رفع إيصال InstaPay (1,250 ج.م)، وفصل الـ 50 ج.م الزائدة آلياً كأمانات إكراميات مناديب دون تضخم وهمي للإيرادات.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">7</span>
                <div>
                  <div className="font-bold text-white">الإدارة العليا وسجل الأستاذ العام (C-Suite Double-Entry Ledger)</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">استعراض القيود المزدوجة التلقائية، توريد عهدة المندوب عبر <code className="text-teal-300">cash_transfer</code>، وتأكيد تحقيق هامش ربح إجمالي 88% وتطابق الأرصدة (Zero Variance).</p>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>Hyper-Automation: Touch Enabled</span>
            <span>Zero Emojis Enforced</span>
          </div>
        </Card>
      </div>

      {/* Bottom Section: Double-Entry Accounting Ledger Table */}
      <Card className="bg-slate-900 border-slate-700 shadow-2xl">
        <CardHeader className="border-b border-slate-800 bg-slate-950/60 p-4 md:p-6 flex flex-row justify-between items-center">
          <CardTitle className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-400" />
            جدول القيود المحاسبية المزدوجة لطلب التجمع الخامس (#ORD-2026-995)
          </CardTitle>
          <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-600">التطابق المالي: Zero Variance Reconciled</Badge>
        </CardHeader>
        <CardContent className="p-4 md:p-6 overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-950 text-teal-400">
                <th className="p-3 font-bold">المرحلة التشغيلية (APDO Process)</th>
                <th className="p-3 font-bold">الحساب المدين (Debit Account - EGP)</th>
                <th className="p-3 font-bold">الحساب الداين (Credit Account - EGP)</th>
                <th className="p-3 font-bold text-center">المبلغ (ج.م)</th>
                <th className="p-3 font-bold">الأثر الخزيني النقدي (Cash Safe Impact)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              <tr className="hover:bg-slate-800/40 transition">
                <td className="p-3 font-bold text-white">1. إنشاء الطلب واعتماد الفاتورة</td>
                <td className="p-3">العملاء / ذمم مدينة (Accounts Receivable)</td>
                <td className="p-3">إيرادات خدمات الغسيل والكي (Service Revenue)</td>
                <td className="p-3 text-center font-mono font-bold text-teal-400">1,200.00</td>
                <td className="p-3 text-slate-400">cash_impact: false (استحقاق آجل حتى التسليم)</td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition">
                <td className="p-3 font-bold text-white">2. فرز وتدقيق الفاتورة</td>
                <td className="p-3">تشغيل تحت التشغيل (WIP Inventory Allocation)</td>
                <td className="p-3">احتياطي تكلفة المبيعات التقديرية (Estimated COGS Reserve)</td>
                <td className="p-3 text-center font-mono font-bold text-teal-400">144.00</td>
                <td className="p-3 text-slate-400">cash_impact: false (تخصيص تكلفة أولية)</td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition">
                <td className="p-3 font-bold text-amber-300">3. غسيل ومعالجة كيميائية (بقعة الفستان)</td>
                <td className="p-3">مصروفات تشغيل ومواد غسيل (Chemical Expenses)</td>
                <td className="p-3">مخزون الخامات والمذيبات (Raw Material Inventory)</td>
                <td className="p-3 text-center font-mono font-bold text-amber-400">65.00</td>
                <td className="p-3 text-slate-400">cash_impact: false (journal_required: true استنفاد مخزون)</td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition">
                <td className="p-3 font-bold text-white">4. كي الطلب (أحمد محمود - أجر إنتاجية)</td>
                <td className="p-3">أجور وتشغيل مباشر / كي (Direct Labor Expense)</td>
                <td className="p-3">أجور ورواتب مستحقة الدفع (Accrued Payroll Liability)</td>
                <td className="p-3 text-center font-mono font-bold text-teal-400">110.00</td>
                <td className="p-3 text-slate-400">cash_impact: false (استحقاق حتى صرف الرواتب)</td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition">
                <td className="p-3 font-bold text-white">5. تغليف واعتماد الجودة</td>
                <td className="p-3">مصروفات تشغيل / مواد تغليف (Packaging Expense)</td>
                <td className="p-3">مخزون مواد التغليف والعلب (Packaging Inventory)</td>
                <td className="p-3 text-center font-mono font-bold text-teal-400">35.00</td>
                <td className="p-3 text-slate-400">cash_impact: false (تثبيت التكلفة الفعلية COGS = 210 ج.م)</td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition bg-teal-950/20">
                <td className="p-3 font-bold text-teal-300">6. التوصيل وتحصيل InstaPay بالزيادة</td>
                <td className="p-3">البنك / وسيط تحويلات InstaPay (Bank Clearing)</td>
                <td className="p-3">العملاء (1,200) + أمانات تِبس مناديب مستحقة (50)</td>
                <td className="p-3 text-center font-mono font-bold text-teal-300">1,250.00</td>
                <td className="p-3 text-emerald-400 font-bold">cash_impact: true (تحصيل إلكتروني وفصل التبس آلياً)</td>
              </tr>
              <tr className="bg-slate-950 font-black text-white border-t-2 border-teal-500">
                <td className="p-4 text-emerald-400">7. إقفال الوردية والتطابق المالي النهائي</td>
                <td className="p-4">إجمالي التكلفة المباشرة COGS = <span className="font-mono text-red-400">210.00 ج.م</span></td>
                <td className="p-4">مجمل الربح المحقق = <span className="font-mono text-emerald-400">990.00 ج.م</span> (82.5% Margin)</td>
                <td className="p-4 text-center font-mono text-teal-400 text-base">1,200.00</td>
                <td className="p-4 text-emerald-400">تطابق تام (Zero Variance Reconciled)</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
