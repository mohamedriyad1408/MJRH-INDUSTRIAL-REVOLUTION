import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { BookOpenCheck, Calculator, CheckCircle2, HelpCircle, Map, PackageCheck, Shirt, Truck, Users, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/help")({
  head: () => ({ meta: [{ title: "User Guide - MJRH" }] }),
  component: HelpPage,
});

type Guide = {
  title: string;
  roles: string[];
  icon: React.ReactNode;
  goal: string;
  steps: string[];
  links: { label: string; href: string }[];
};

const guidesAr: Guide[] = [
  {
    title: "المالك / المدير",
    roles: ["owner", "ops_manager", "cs_manager"],
    icon: <BookOpenCheck className="w-5 h-5" />,
    goal: "ابدأ اليوم، راقب التشغيل، عالج التنبيهات، وأنهِ اليوم بإقفال الخزن.",
    steps: [
      "افتح تشغيل اليوم وشاهد جاهزية العمل الآن.",
      "راجع فحص النظام لو فيه تنبيه أحمر أو أصفر.",
      "راقب الخريطة لتوزيع الاستلام والتوصيل.",
      "راجع التقارير والمالية قبل نهاية اليوم.",
      "أقفل كل الخزن في نهاية اليوم فقط.",
    ],
    links: [
      { label: "تشغيل اليوم", href: "/daily-operations" },
      { label: "فحص النظام", href: "/system-health" },
      { label: "الخريطة", href: "/live-map" },
      { label: "إقفال الخزن", href: "/cash-closing" },
    ],
  },
  {
    title: "الاستقبال وخدمة العملاء",
    roles: ["owner", "ops_manager", "cs_manager", "employee"],
    icon: <Users className="w-5 h-5" />,
    goal: "سجل الطلبات والقطع، راجع الفاتورة، وساعد العميل في التتبع والدفع.",
    steps: [
      "افتح طلب جديد واختر العميل أو أضف عميل جديد.",
      "أضف الخدمات والقطع وصور القطع عند الحاجة.",
      "من الاستقبال اضغط تشغيل؛ طلب الكي فقط يدخل الكي مباشرة، والتنظيف يدخل الغسيل.",
      "بعد انتهاء التشغيل اعتمد الفاتورة وأرسل رابط التتبع من واتساب.",
      "لو رجعت قطعة بعد التسليم، افتح الطلب وسجل مرتجع عميل على القطعة نفسها.",
    ],
    links: [
      { label: "طلب جديد", href: "/orders/new" },
      { label: "الاستقبال", href: "/stations/reception" },
      { label: "الالطلبات", href: "/orders" },
      { label: "العملاء", href: "/customers" },
    ],
  },
  {
    title: "الغسيل والتنظيف",
    roles: ["owner", "ops_manager", "employee"],
    icon: <PackageCheck className="w-5 h-5" />,
    goal: "إنهاء التنظيف والمرتجعات بدون إدخال طلبات متسلمة في قائمة العمل.",
    steps: [
      "راجع قطع التنظيف ومرتجعات العملاء المفتوحة فقط.",
      "اضغط تم تنظيفه لكل قطعة بعد الانتهاء.",
      "لو القطعة مرتجع داخلي، ستعود لنفس فني الكي أو لفني حاضر حسب التوزيع.",
      "لو الطلب متسلم سابقًا، يظهر كمرتجع عميل مستقل ولا يعاد فتح الطلب القديم كله.",
    ],
    links: [{ label: "محطة التنظيف", href: "/stations/cleaning" }],
  },
  {
    title: "التجفيف والتجميع والليبل",
    roles: ["owner", "ops_manager", "employee"],
    icon: <PackageCheck className="w-5 h-5" />,
    goal: "تجميع القطع وحل مشاكل المارك/الليبل قبل الكي والتسليم.",
    steps: [
      "ابدأ مراجعة القطعة بعد انتهاء التنظيف.",
      "لو الليبل مفقود أو غير واضح، سجل المشكلة ولا تدخل القطعة للكي قبل الحل.",
      "استخدم تصوير/بحث للمساعدة في مطابقة القطع عند الحاجة.",
      "بعد حل الليبل اضغط جاهز للكي.",
    ],
    links: [{ label: "التجفيف والتجميع", href: "/stations/drying-assembly" }],
  },
  {
    title: "فني الكي",
    roles: ["owner", "ops_manager", "employee"],
    icon: <Shirt className="w-5 h-5" />,
    goal: "الكي يتوزع فقط على الفنيين الحاضرين، واليومية تحسب من قيمة الكي المرجعية.",
    steps: [
      "اضغط حضور عند بداية الشغل، وانصراف عند المغادرة.",
      "القطع تتوزع تلقائيًا حسب الحضور والحمل الحالي.",
      "لو خرج فني، غير المكتمل يعاد توزيعه على الحاضرين.",
      "لو القطعة تحتاج تنظيف، سجل مرتجع تنظيف بسبب واضح.",
      "اليومية تعتمد على قيمة الكي المقابلة للصنف حتى لو الطلب تنظيف+كي.",
    ],
    links: [{ label: "الكي", href: "/stations/ironing" }, { label: "رواتب فنيي الكي", href: "/staff/ironing-payroll" }],
  },
  {
    title: "المندوب والخريطة",
    roles: ["owner", "ops_manager", "courier"],
    icon: <Truck className="w-5 h-5" />,
    goal: "تحديث الموقع، استلام الطلبات، وتسليمها بخط سير واضح.",
    steps: [
      "المندوب يفتح لوحة السائق ويضغط موقعي.",
      "المدير يوزع المهام من الخريطة، ولو فشل التوزيع سيظهر السبب: لا مندوب، لا موقع، أو لا مهام.",
      "اختر نقطتين أو أكثر من الخريطة أو القائمة ثم اضغط رسم خط السير.",
      "يمكن فتح الخط في Google Maps.",
    ],
    links: [{ label: "لوحة السائق", href: "/driver" }, { label: "الخريطة", href: "/live-map" }],
  },
  {
    title: "المحاسبة والخزنة",
    roles: ["owner", "ops_manager"],
    icon: <Calculator className="w-5 h-5" />,
    goal: "كل دخل/مصروف/دفع له حركة خزنة وقيد، وإقفال الخزن يتم نهاية اليوم.",
    steps: [
      "المصروف المدفوع ينشئ حركة خزنة وقيد تلقائيًا.",
      "المصروف الآجل ينشئ قيد استحقاق، وعند الدفع ينشئ قيد سداد.",
      "InstaPay يربط صورة الإيصال كمستند مالي.",
      "الزيادة في الدفع تسجل كتِبس للمندوب وقيد مالي.",
      "لا تقفل الخزن إلا في نهاية اليوم.",
    ],
    links: [{ label: "المحاسبة والخزنة", href: "/accounting" }, { label: "إقفال الخزن", href: "/cash-closing" }, { label: "القيود", href: "/ledger" }],
  },
  {
    title: "رسائل واتساب",
    roles: ["owner", "ops_manager", "cs_manager"],
    icon: <Wallet className="w-5 h-5" />,
    goal: "النظام يجهز رسالة واتساب، والموظف يرسلها يدويًا بدون API مدفوع.",
    steps: [
      "افتح فحص النظام.",
      "راجع رسائل WhatsApp المعلقة.",
      "اضغط فتح WhatsApp لإرسال الرسالة الجاهزة.",
      "بعد الإرسال اضغط تم الإرسال لتسجيلها في النظام.",
    ],
    links: [{ label: "فحص النظام", href: "/system-health" }],
  },
];

const guidesEn: Guide[] = [
  {
    title: "Owner / Manager",
    roles: ["owner", "ops_manager", "cs_manager"],
    icon: <BookOpenCheck className="w-5 h-5" />,
    goal: "Start the day, monitor operations, handle alerts, and close safes at the end of the day.",
    steps: [
      "Open Daily Operations and check work readiness.",
      "Review System Health if there are critical red or amber warnings.",
      "Monitor the live map to assign pickup and delivery requests.",
      "Review financial reports before ending the day.",
      "Close all safes only at the absolute end of the day.",
    ],
    links: [
      { label: "Daily Operations", href: "/daily-operations" },
      { label: "System Health", href: "/system-health" },
      { label: "Live Map", href: "/live-map" },
      { label: "Safe Closing", href: "/cash-closing" },
    ],
  },
  {
    title: "Reception & CS",
    roles: ["owner", "ops_manager", "cs_manager", "employee"],
    icon: <Users className="w-5 h-5" />,
    goal: "Register orders and pieces, approve invoices, and help customers track and pay.",
    steps: [
      "Open new order and choose customer or create a new one.",
      "Add services and garments, capturing photos where needed.",
      "In reception, press start; ironing-only goes to ironing, others go to washing.",
      "After operations finish, confirm the invoice and send WhatsApp tracking link.",
      "If a customer returns pieces after delivery, open order and log customer return.",
    ],
    links: [
      { label: "New Order", href: "/orders/new" },
      { label: "Reception", href: "/stations/reception" },
      { label: "All Orders", href: "/orders" },
      { label: "Customers", href: "/customers" },
    ],
  },
  {
    title: "Washing & Cleaning",
    roles: ["owner", "ops_manager", "employee"],
    icon: <PackageCheck className="w-5 h-5" />,
    goal: "Complete washing and handle returns without modifying existing delivered orders.",
    steps: [
      "Review pending cleaning pieces and open customer returns only.",
      "Press Cleaned for each piece after completion.",
      "If it is an internal reclean return, it goes back to the assigned ironing technician.",
      "Delivered orders appear as separate customer returns, no need to reopen old invoices.",
    ],
    links: [{ label: "Cleaning Station", href: "/stations/cleaning" }],
  },
  {
    title: "Drying & Assembly",
    roles: ["owner", "ops_manager", "employee"],
    icon: <PackageCheck className="w-5 h-5" />,
    goal: "Assemble pieces and resolve mark/label issues before ironing and delivery.",
    steps: [
      "Start reviewing the garment after cleaning completes.",
      "If label is missing or unclear, report issue and do not send to ironing.",
      "Use camera photo search to match lost pieces if needed.",
      "After solving label issues, mark as ready for ironing.",
    ],
    links: [{ label: "Drying & Assembly", href: "/stations/drying-assembly" }],
  },
  {
    title: "Ironing Technician",
    roles: ["owner", "ops_manager", "employee"],
    icon: <Shirt className="w-5 h-5" />,
    goal: "Ironing is assigned only to present technicians, and payouts are calculated from reference values.",
    steps: [
      "Press Check-In at the start of work, and Check-Out upon leaving.",
      "Pieces are distributed automatically based on attendance and current load.",
      "If a tech leaves, uncompleted tasks are redistributed to present ones.",
      "If a garment needs reclean, register reclean return with a clear reason.",
      "Payouts depend on the ironing reference value of the item, even if order is Clean+Iron.",
    ],
    links: [{ label: "Ironing", href: "/stations/ironing" }, { label: "Ironing Payroll", href: "/staff/ironing-payroll" }],
  },
  {
    title: "Courier & Map",
    roles: ["owner", "ops_manager", "courier"],
    icon: <Truck className="w-5 h-5" />,
    goal: "Update location, pickup orders, and deliver with clear route planning.",
    steps: [
      "Couriers open the driver dashboard and press My Location.",
      "Managers assign tasks from the map. If it fails, reason is shown.",
      "Select two or more points on the map or list, then press Draw Route.",
      "You can open the planned route directly in Google Maps.",
    ],
    links: [{ label: "Courier Dashboard", href: "/driver" }, { label: "Live Map", href: "/live-map" }],
  },
  {
    title: "Accounting & Safes",
    roles: ["owner", "ops_manager"],
    icon: <Calculator className="w-5 h-5" />,
    goal: "Every transaction has an automatic cash movement and journal, closing is done daily.",
    steps: [
      "Paid expenses create cash movements and journal entries automatically.",
      "Payable expenses create accrual journals, payment creates settlement journals.",
      "InstaPay uploads are linked directly as payment proofs.",
      "Overpayments are recorded as courier tips with associated accounting journals.",
      "Do not close safes until the absolute end of the business day.",
    ],
    links: [{ label: "Accounting & Cash", href: "/accounting" }, { label: "Safe Closing", href: "/cash-closing" }, { label: "Accounting Ledger", href: "/ledger" }],
  },
  {
    title: "WhatsApp Messages",
    roles: ["owner", "ops_manager", "cs_manager"],
    icon: <Wallet className="w-5 h-5" />,
    goal: "The system prepares WhatsApp text, and staff sends it manually without paid API costs.",
    steps: [
      "Open System Health.",
      "Review pending WhatsApp queue.",
      "Click Open WhatsApp to send the pre-written template text.",
      "After sending, click Mark Sent to record it in the database.",
    ],
    links: [{ label: "System Health", href: "/system-health" }],
  },
];

function HelpPage() {
  const { roles, hasRole } = useAuth();
  const { t, dir, language } = useI18n();
  
  const isAr = language === "ar";
  const list = isAr ? guidesAr : guidesEn;
  const visible = list.filter((g) => g.roles.some((r) => hasRole(r as any)) || roles.includes("super_admin" as any));

  return (
    <div className="space-y-5" dir={dir}>
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-teal-800 text-white p-6 shadow-xl">
        <h1 className="text-3xl font-black flex items-center gap-2"><HelpCircle className="w-7 h-7 text-teal-200" /> {t("help.title")}</h1>
        <p className="text-sm text-white/75 mt-2">{t("help.subtitle")}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {visible.map((g) => <Card key={g.title} className="overflow-hidden">
          <CardHeader className="bg-muted/40">
            <CardTitle className="flex items-center gap-2 text-base">{g.icon}{g.title}<Badge variant="secondary" className="me-auto">{g.roles.length} {isAr ? "أدوار" : "roles"}</Badge></CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground font-medium">{g.goal}</p>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              {g.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <div className="flex flex-wrap gap-2 pt-2">
              {g.links.map((l) => <Button key={l.href + l.label} asChild size="sm" variant="outline"><Link to={l.href as any}>{l.label}</Link></Button>)}
            </div>
          </CardContent>
        </Card>)}
      </div>

      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-4 text-sm text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 mt-0.5" />
          <div>
            {isAr ? (
              <><b>قاعدة ثابتة:</b> لو ظهرت مشكلة في فحص النظام أو رحلة الطلب، اضغط زر الإصلاح إن وجد. لو لا يوجد إصلاح تلقائي، ستجد رابط الصفحة المسؤولة عن الخطوة.</>
            ) : (
              <><b>Golden Rule:</b> If a problem appears in system health or the order journey, click the repair button if available. If there is no auto-repair, you will find a link to the page responsible for that step.</>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
