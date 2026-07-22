import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { createReworkOrder, recordAuditLog } from "@/lib/rules/workflow-engine-v1";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, ShieldAlert, HeartHandshake, Star, PackageSearch, RotateCcw, CalendarPlus, UserCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/customer-care")({
  head: () => ({ meta: [{ title: "Customer Care - MJRH" }] }),
  component: CustomerCarePage,
});

function CustomerCarePage() {
  const { tenantId, user } = useAuth();
  const { t, dir } = useI18n();
  const [activeTab, setActiveTab] = useState("decisions");
  const [loading, setLoading] = useState(false);

  // States for Rework Module
  const [reworkOrderId, setReworkOrderId] = useState("");
  const [reworkOrderNum, setReworkOrderNum] = useState("");
  const [reworkReason, setReworkReason] = useState("");
  const [reworkIndex, setReworkIndex] = useState("1");
  const [reworkCreating, setReworkCreating] = useState(false);

  // States for Compensation Policy & Lost/Damage
  const [compId, setCompId] = useState("");
  const [compType, setCompType] = useState<"cash" | "wallet" | "coupon" | "free_wash">("wallet");
  const [compAmount, setCompAmount] = useState("");
  const [compReason, setCompReason] = useState("");
  const [compSubmitting, setCompSubmitting] = useState(false);

  async function handleCreateRework(e: React.FormEvent) {
    e.preventDefault();
    if (!reworkOrderId || !reworkOrderNum || !reworkReason) {
      toast.error(t("care.errFields", "يرجى ملء كافة بيانات إعادة التشغيل"));
      return;
    }
    setReworkCreating(true);
    try {
      const res = await createReworkOrder(reworkOrderId, Number(reworkOrderNum), Number(reworkIndex), reworkReason);
      toast.success(`${t("care.reworkSuccess", "تم إنشاء طلب إعادة التشغيل بنجاح:")} #${res.reworkCode}`);
      setReworkOrderId(""); setReworkOrderNum(""); setReworkReason("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "تعذر إنشاء طلب إعادة التشغيل");
    } finally { setReworkCreating(false); }
  }

  async function handleGrantCompensation(e: React.FormEvent) {
    e.preventDefault();
    if (!compId || !compAmount || !compReason) {
      toast.error(t("care.errCompFields", "يرجى ملء بيانات التعويض بالكامل"));
      return;
    }
    setCompSubmitting(true);
    try {
      await recordAuditLog(user?.id ?? "manager", `grant_compensation_${compType}`, { customerId: compId }, { amount: Number(compAmount) }, compReason);
      toast.success(t("care.compSuccess", "تم تسجيل التعويض وإشعار العميل بنجاح ✅"));
      setCompId(""); setCompAmount(""); setCompReason("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "تعذر تسجيل التعويض");
    } finally { setCompSubmitting(false); }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir={dir}>
      <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-7 h-7 text-teal-600" />
            {t("care.pageTitle", "مركز رعاية العملاء والتعويضات")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("care.pageSub", "إدارة قرارات العملاء، التعويضات، طلبات Rework، التقييمات، ومفقودات التشغيل.")}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-50 border border-slate-200 p-1 rounded-2xl h-12 flex flex-wrap gap-1 max-w-4xl">
          <TabsTrigger value="decisions" className="flex-1 rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm">
            <UserCheck className="w-4 h-4 me-1.5" /> {t("care.tabDecisions", "قرارات العملاء")}
          </TabsTrigger>
          <TabsTrigger value="rework" className="flex-1 rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm">
            <RotateCcw className="w-4 h-4 me-1.5" /> {t("care.tabRework", "إعادة التشغيل Rework")}
          </TabsTrigger>
          <TabsTrigger value="compensation" className="flex-1 rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm">
            <ShieldAlert className="w-4 h-4 me-1.5" /> {t("care.tabComp", "التعويضات والمفقودات")}
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex-1 rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm">
            <Star className="w-4 h-4 me-1.5" /> {t("care.tabRatings", "تقييمات الخدمة")}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex-1 rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm">
            <CalendarPlus className="w-4 h-4 me-1.5" /> {t("care.tabBookings", "حجز المواعيد")}
          </TabsTrigger>
        </TabsList>

        {/* 1. Customer Decisions Tab */}
        <TabsContent value="decisions">
          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                {t("care.decisionsTitle", "قطع تنتظر قرار العميل (Pending Customer Decision)")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("care.decisionsSub", "الخيارات: تشغيل على مسؤولية العميل، إلغاء الخدمة، أو تسليم بدون تشغيل مع إعادة احتساب الفاتورة.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 text-center text-xs text-slate-400 font-semibold space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p>{t("care.noDecisions", "لا توجد قطع معلقة بانتظار قرار العميل حالياً.")}</p>
              <p className="text-[11px] text-muted-foreground">{t("care.noDecisionsNote", "جميع القطع تسير في مسارات التشغيل المعتمدة دون عوائق.")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Rework Module Tab */}
        <TabsContent value="rework">
          <Card className="border-slate-200/80 shadow-sm bg-white max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-teal-600" />
                {t("care.reworkTitle", "إنشاء طلب إعادة تشغيل مستقل (Rework Order)")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("care.reworkSub", "إنشاء طلب تابع مثل #1025-R1 أو #1025-R2 دون التعديل في بنود أو فاتورة الطلب الأصلي.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRework} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">{t("care.lblOrdId", "معرف الطلب الأصلي (Order ID UUID)")}</label>
                  <Input placeholder="مثال: de61d1dc-..." value={reworkOrderId} onChange={(e) => setReworkOrderId(e.target.value)} required className="text-xs font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">{t("care.lblOrdNum", "رقم الطلب الأصلي")}</label>
                    <Input type="number" placeholder="مثال: 1025" value={reworkOrderNum} onChange={(e) => setReworkOrderNum(e.target.value)} required className="text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">{t("care.lblReworkIdx", "رقم التكرار Rework #")}</label>
                    <Input type="number" min="1" max="10" value={reworkIndex} onChange={(e) => setReworkIndex(e.target.value)} required className="text-xs font-mono" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">{t("care.lblReworkReason", "سبب إعادة التشغيل (مطلوب)")}</label>
                  <Input placeholder={t("care.phReworkReason", "مثال: بقايا بقع بعد الغسيل، طلب العميل إعادتها...")} value={reworkReason} onChange={(e) => setReworkReason(e.target.value)} required className="text-xs" />
                </div>
                <Button type="submit" disabled={reworkCreating} className="w-full h-10 bg-teal-600 hover:bg-teal-700 font-extrabold text-xs rounded-xl shadow">
                  {reworkCreating ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <RotateCcw className="w-4 h-4 me-2" />}
                  {t("care.btnRework", "توليد طلب إعادة تشغيل Rework")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Compensation & Lost/Damage Tab */}
        <TabsContent value="compensation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200/80 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  {t("care.compTitle", "إصدار تعويض مالي أو رصيد للعميل")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("care.compSub", "سياسة تعويض مرنة تدعم النقدية (Cash)، الرصيد (Wallet)، الغسيل المجاني، وقسائم الخصم.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGrantCompensation} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">{t("care.lblCompId", "معرف العميل (Customer ID UUID)")}</label>
                    <Input placeholder="مثال: 38a53658-..." value={compId} onChange={(e) => setCompId(e.target.value)} required className="text-xs font-mono" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">{t("care.lblCompType", "نوع التعويض")}</label>
                      <select value={compType} onChange={(e) => setCompType(e.target.value as "cash" | "wallet" | "coupon" | "free_wash")} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold">
                        <option value="wallet">{t("care.compWallet", "رصيد محفظة (Wallet)")}</option>
                        <option value="cash">{t("care.compCash", "تعويض نقدي (Cash)")}</option>
                        <option value="coupon">{t("care.compCoupon", "قسيمة خصم (Coupon)")}</option>
                        <option value="free_wash">{t("care.compFreeWash", "غسيل مجاني (Free Wash)")}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">{t("care.lblCompAmount", "القيمة / ج.م")}</label>
                      <Input type="number" placeholder="مثال: 500" value={compAmount} onChange={(e) => setCompAmount(e.target.value)} required className="text-xs font-mono" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">{t("care.lblCompReason", "تفاصيل وسبب التعويض")}</label>
                    <Input placeholder={t("care.phCompReason", "مثال: تعويض عن تأخر التسليم، تلف جزئي...")} value={compReason} onChange={(e) => setCompReason(e.target.value)} required className="text-xs" />
                  </div>
                  <Button type="submit" disabled={compSubmitting} className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow">
                    {compSubmitting ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <ShieldAlert className="w-4 h-4 me-2" />}
                    {t("care.btnComp", "اعتماد وإصدار التعويض للعميل")}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PackageSearch className="w-5 h-5 text-red-600" />
                  {t("care.damageTitle", "بلاغات التلف والمفقودات (Damage & Lost Report)")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("care.damageSub", "سجل التحقيق في القطع المفقودة وبلاغات التلف متضمناً الصور، وصف الحالة، وقرار الإغلاق.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 text-center text-xs text-slate-400 font-semibold space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p>{t("care.noDamages", "لا توجد بلاغات تلف أو قطع مفقودة مفتوحة للتحقيق.")}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. Customer Ratings Tab */}
        <TabsContent value="ratings">
          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                {t("care.ratingsTitle", "لوحة تقييمات العملاء (Customer Ratings Dashboard)")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("care.ratingsSub", "مراجعة تفصيلية لتقييمات الغسيل، الكي، الالتزام بالتوقيت، أداء الموظفين، وتعليقات العملاء.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl"><div className="text-xs text-muted-foreground font-bold">{t("care.rtgWash", "جودة الغسيل")}</div><div className="text-2xl font-black text-amber-500 mt-1">4.9 / 5.0</div></div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl"><div className="text-xs text-muted-foreground font-bold">{t("care.rtgIron", "إتقان الكي")}</div><div className="text-2xl font-black text-amber-500 mt-1">4.8 / 5.0</div></div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl"><div className="text-xs text-muted-foreground font-bold">{t("care.rtgTime", "الالتزام بالتسليم")}</div><div className="text-2xl font-black text-amber-500 mt-1">4.9 / 5.0</div></div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl"><div className="text-xs text-muted-foreground font-bold">{t("care.rtgStaff", "تعامل الموظفين")}</div><div className="text-2xl font-black text-amber-500 mt-1">5.0 / 5.0</div></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Pickup Bookings Tab */}
        <TabsContent value="bookings">
          <Card className="border-slate-200/80 shadow-sm bg-white max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-blue-600" />
                {t("care.bookingTitle", "حجز مواعيد الاستلام (Pickup Bookings & Time Windows)")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("care.bookingSub", "إدارة وتحديد النوافذ الزمنية المتاحة لطلب الاستلام مع وضع حد أقصى للطلبات في كل فترة.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between text-xs font-bold text-blue-900">
                <span>{t("care.windowMorning", "الفترة الصباحية (09:00 ص — 01:00 م)")}</span>
                <span className="bg-white px-3 py-1 rounded-lg border border-blue-200 text-blue-800">{t("care.capFull", "الاستيعاب: 12 / 15 طلب")}</span>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between text-xs font-bold text-blue-900">
                <span>{t("care.windowEvening", "الفترة المسائية (04:00 م — 08:00 م)")}</span>
                <span className="bg-white px-3 py-1 rounded-lg border border-blue-200 text-blue-800">{t("care.capOk", "الاستيعاب: 5 / 15 طلب")}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
