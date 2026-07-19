import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { useI18n, interpolate } from "@/lib/i18n";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Target, Award, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Clock, DollarSign, User, ShieldCheck, Printer, Plus, Gift, MinusCircle,
  FileText, BriefcaseBusiness, Loader2, Sparkles, Building2, Calendar, Search,
  Star, Grid, Layers, Zap, HeartHandshake, Lightbulb, GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/$tenant/staff/scorecard")({
  head: () => ({ meta: [{ title: "التقييم المؤسسي الأوروبي 360° — Scorecard" }] }),
  component: EuropeanScorecardPage,
});

type Employee = {
  id: string;
  full_name: string;
  job_title?: string | null;
  station?: string | null;
  role?: string | null;
  monthly_salary?: number | null;
  commission_percent?: number | null;
  is_active?: boolean;
  branches?: { name?: string };
};

type AttendanceRecord = {
  id: string;
  work_date: string;
  check_in_at: string;
  check_out_at?: string | null;
  notes?: string | null;
};

type LedgerEntry = {
  id: string;
  entry_type: string;
  amount: number;
  direction: string;
  description?: string | null;
  source_type?: string | null;
  entry_at: string;
};

type IdpGoal = {
  id: string;
  title: string;
  targetDate: string;
  status: "pending" | "achieved";
};

function computeEuropeanAppraisal(
  emp: Employee,
  att: AttendanceRecord[],
  ledger: LedgerEntry[],
  teamworkRating: number,
  hseRating: number,
  initiativeRating: number,
  t: any
) {
  const totalShifts = att.length;
  let delayCount = 0;
  let delayMinutes = 0;

  att.forEach((r) => {
    try {
      const dateStr = r.work_date;
      const officialStart = new Date(`${dateStr}T09:00:00`).getTime(); // default 9 AM
      const gracePeriod = 15 * 60 * 1000; // 15 mins grace
      const actualStart = new Date(r.check_in_at).getTime();
      if (actualStart > officialStart + gracePeriod) {
        delayCount++;
        delayMinutes += Math.floor((actualStart - officialStart) / (1000 * 60));
      }
    } catch {}
  });

  // Pillar 1: Operational Discipline & Punctuality (20% weight)
  const attPenalty = delayCount * 5 + Math.floor(delayMinutes / 10);
  const disciplineScore = Math.max(0, Math.min(100, 100 - attPenalty));

  // Analyze Financial Adjustments
  let totalEarned = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  let totalTips = 0;
  let totalAdvances = 0;

  ledger.forEach((l) => {
    const amt = Number(l.amount || 0);
    const isTip = l.source_type === "driver_tip" || (l.description || "").includes("بقشيش");
    if (l.direction === "employee_due") {
      totalEarned += amt;
      if (isTip) {
        totalTips += amt;
      } else if (l.entry_type === "adjustment" || (l.description || "").includes("مكافأة") || (l.description || "").includes("حافز")) {
        totalBonuses += amt;
      }
    } else {
      if (l.entry_type === "advance") totalAdvances += amt;
      else if (l.entry_type === "adjustment" || (l.description || "").includes("خصم")) totalDeductions += amt;
    }
  });

  // Pillar 2: Productivity & Output Volume (25% weight)
  let outputScore = 75 + Math.min(20, totalShifts * 2);
  if (totalBonuses > 0) outputScore = Math.min(100, outputScore + 10);

  // Pillar 3: Quality Assurance & Accuracy (20% weight)
  let qualityScore = 90;
  if (totalDeductions > 0) qualityScore = Math.max(20, qualityScore - Math.floor(totalDeductions / 10));

  // Qualitative Pillars (Normalized from 1-5 scale to 100%)
  const teamworkScore = Math.round((teamworkRating / 5) * 100);     // 15% weight
  const hseScore = Math.round((hseRating / 5) * 100);               // 10% weight
  const initiativeScore = Math.round((initiativeRating / 5) * 100); // 10% weight

  // Weighted European Overall Appraisal Grade
  const overallScore = Math.round(
    disciplineScore * 0.20 +
    outputScore * 0.25 +
    qualityScore * 0.20 +
    teamworkScore * 0.15 +
    hseScore * 0.10 +
    initiativeScore * 0.10
  );

  // Map to European 9-Box Talent Grid
  let gridCategory = t("scorecard.categoryConsistent", "Consistent Contributor (المساهم المستقر)");
  let gridBoxColor = "bg-blue-600 text-white";
  let gridDesc = t("scorecard.descConsistent", "أداء تشغيلي مستقر وموثوق يفي بالمعايير المعتمدة للمؤسسة.");
  let actionRecommendation = "normal";

  if (overallScore >= 88) {
    gridCategory = t("scorecard.categoryStar", "Star Talent (قائد مستقبلي وشريك استراتيجي)");
    gridBoxColor = "bg-gradient-to-r from-emerald-600 to-teal-600 text-white";
    gridDesc = t("scorecard.descStar", "أداء استثنائي يتجاوز جميع المعايير الأوروبية في الجودة والالتزام والمبادرة. استحقاق ترقية فورية أو حافز تميز مؤسسي.");
    actionRecommendation = "bonus";
  } else if (overallScore >= 75) {
    gridCategory = t("scorecard.categoryCore", "🟢 Core Performer (خبير تشغيلي محترف)");
    gridBoxColor = "bg-emerald-600 text-white";
    gridDesc = t("scorecard.descCore", "ركيزة أساسية في تشغيل النشاط، يظهر التزاماً عالياً بالجودة ومواعيد العمل بانتظام.");
    actionRecommendation = "bonus";
  } else if (overallScore >= 60) {
    gridCategory = t("scorecard.categoryContributor", "Consistent Contributor (أداء مستقر وموثوق)");
    gridBoxColor = "bg-blue-600 text-white";
    gridDesc = t("scorecard.descContributor", "ينجز المطلوب بكفاءة جيدة، ويحتاج تعزيز في بعض مجالات المبادرة أو الالتزام.");
    actionRecommendation = "normal";
  } else if (overallScore >= 45) {
    gridCategory = t("scorecard.categoryUnderperformer", "Underperformer (أداء متذبذب — خطة تحسين PIP)");
    gridBoxColor = "bg-amber-500 text-white";
    gridDesc = t("scorecard.descUnderperformer", "قصور في الالتزام بالمواعيد أو معايير الجودة. يجب وضعه تحت خطة تحسين أداء إلزامية (PIP) لمدة شهر.");
    actionRecommendation = "warning";
  } else {
    gridCategory = t("scorecard.categoryExit", "Exit Candidate (إنذار أحمر / استمارة 6 إنهاء خدمة)");
    gridBoxColor = "bg-red-600 text-white animate-pulse";
    gridDesc = t("scorecard.descExit", "فشل في استيفاء الحد الأدنى من معايير العمل المؤسسي الأوروبية. يُنصح باتخاذ إجراءات إنهاء التعاقد (استمارة 6).");
    actionRecommendation = "form6";
  }

  return {
    totalShifts,
    delayCount,
    delayMinutes,
    disciplineScore,
    outputScore,
    qualityScore,
    teamworkScore,
    hseScore,
    initiativeScore,
    overallScore,
    totalEarned,
    totalDeductions,
    totalBonuses,
    totalTips,
    totalAdvances,
    gridCategory,
    gridBoxColor,
    gridDesc,
    actionRecommendation,
  };
}

function EuropeanScorecardPage() {
  const { tenantId, hasRole } = useAuth();
  const { t, dir } = useI18n();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [search, setSearch] = useState("");

  // European Competency Qualitative Ratings (1 to 5 stars)
  const [teamworkRating, setTeamworkRating] = useState(4);
  const [hseRating, setHseRating] = useState(4);
  const [initiativeRating, setInitiativeRating] = useState(3);

  // Individual Development Plan (IDP) Goals
  const [idpGoals, setIdpGoals] = useState<IdpGoal[]>([
    { id: "1", title: t("scorecard.goal1", "الوصول بنسبة المرتجعات التشغيلية إلى صفر% خلال الشهر"), targetDate: "2026-07-31", status: "pending" },
    { id: "2", title: t("scorecard.goal2", "الالتزام التام بمواعيد الحضور دون أي دقائق تأخير"), targetDate: "2026-07-31", status: "pending" },
  ]);
  const [newGoalTitle, setNewGoalTitle] = useState("");

  // Modals for financial adjustment & Reports
  const [actionType, setActionType] = useState<"bonus" | "deduction" | "form6" | "appraisal_report" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isManager = hasRole("owner", "ops_manager", "cs_manager", "super_admin");

  async function loadEmployees() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, job_title, station, role, monthly_salary, commission_percent, is_active, branches(name)")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      const list = ((data ?? []) as Employee[]).filter((e: any) => e.role !== "owner" && !e.job_title?.includes("مالك") && !e.full_name?.includes("مالك"));
      setEmployees(list);
      if (list.length > 0 && !selectedEmp) {
        selectEmployee(list[0]);
      }
    } catch (err: any) {
      toast.error(err?.message || t("scorecard.errorLoadEmployees", "خطأ في تحميل الموظفين"));
    } finally {
      setLoading(false);
    }
  }

  async function selectEmployee(emp: Employee) {
    setSelectedEmp(emp);
    setLoadingDetails(true);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const [attRes, ledRes] = await Promise.all([
        supabase
          .from("employee_attendance")
          .select("id, work_date, check_in_at, check_out_at, notes")
          .eq("tenant_id", tenantId)
          .eq("employee_id", emp.id)
          .gte("work_date", thirtyDaysAgo)
          .order("work_date", { ascending: false }),
        supabase
          .from("employee_financial_ledger")
          .select("id, entry_type, amount, direction, description, source_type, entry_at")
          .eq("tenant_id", tenantId)
          .eq("employee_id", emp.id)
          .order("entry_at", { ascending: false })
          .limit(30),
      ]);

      setAttendance((attRes.data ?? []) as AttendanceRecord[]);
      setLedger((ledRes.data ?? []) as LedgerEntry[]);
      // Reset qualitative ratings
      setTeamworkRating(4);
      setHseRating(4);
      setInitiativeRating(3);
    } catch (err: any) {
      console.error(err);
      toast.error(t("scorecard.errorLoadDetails", "فشل تحميل تفاصيل الموظف"));
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, [tenantId]);

  const filteredStaff = useMemo(() => {
    if (!search.trim()) return employees;
    const s = search.toLowerCase();
    return employees.filter((e) => e.full_name.toLowerCase().includes(s) || (e.job_title || "").toLowerCase().includes(s));
  }, [employees, search]);

  const stats = useMemo(() => {
    if (!selectedEmp) return null;
    return computeEuropeanAppraisal(selectedEmp, attendance, ledger, teamworkRating, hseRating, initiativeRating, t);
  }, [selectedEmp, attendance, ledger, teamworkRating, hseRating, initiativeRating, t]);

  async function submitAdjustment() {
    if (!selectedEmp || !actionType || actionType === "form6" || actionType === "appraisal_report") return;
    const val = Number(amount);
    if (!val || val <= 0) return toast.error(t("scorecard.errorAmount", "أدخل مبلغاً صحيحاً أكبر من صفر"));
    if (!reason.trim()) return toast.error(t("scorecard.errorReason", "اكتب سبب المكافأة أو الخصم"));

    setSubmitting(true);
    try {
      const direction = actionType === "bonus" ? "employee_due" : "employee_owes";
      const descPrefix = actionType === "bonus" ? t("scorecard.bonusPrefix", "حافز كفاءة مؤسسية (Bonus): ") : t("scorecard.penaltyPrefix", "جزاء إداري / خصم (Penalty): ");

      const { error } = await supabase.from("employee_financial_ledger").insert({
        tenant_id: tenantId,
        employee_id: selectedEmp.id,
        entry_type: "adjustment",
        amount: val,
        direction,
        description: `${descPrefix}${reason.trim()}`,
        source_type: "european_scorecard",
      });

      if (error) throw error;
      toast.success(actionType === "bonus" ? t("scorecard.toastBonusSuccess", "تم صرف الحافز المؤسسي للموظف بنجاح") : t("scorecard.toastPenaltySuccess", "تم إيقاع الجزاء وخصمه من رصيد الموظف"));
      setActionType(null);
      setAmount("");
      setReason("");
      selectEmployee(selectedEmp);
    } catch (err: any) {
      toast.error(err?.message || t("scorecard.errorFinancial", "فشل تسجيل الحركة المالية"));
    } finally {
      setSubmitting(false);
    }
  }

  function addIdpGoal() {
    if (!newGoalTitle.trim()) return;
    setIdpGoals([
      ...idpGoals,
      { id: String(Date.now()), title: newGoalTitle.trim(), targetDate: "2026-08-31", status: "pending" },
    ]);
    setNewGoalTitle("");
    toast.success(t("scorecard.toastGoalAdded", "تم إضافة الهدف إلى خطة تحسين الأداء (IDP)"));
  }

  function toggleGoalStatus(id: string) {
    setIdpGoals(idpGoals.map((g) => (g.id === id ? { ...g, status: g.status === "achieved" ? "pending" : "achieved" } : g)));
  }

  function printDocument() {
    window.print();
  }

  if (!isManager) {
    return <Card className="p-8 text-center text-slate-500 font-bold">{t("scorecard.noAccess", "صلاحية هذه الصفحة مخصصة لمالك النشاط ومديري التشغيل فقط.")}</Card>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20" dir={dir}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-black shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t("scorecard.badgeEuropean", "نظام حوكمة الأداء الأوروبي — European Corporate 360° Appraisal Matrix")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Target className="w-8 h-8 text-indigo-600 shrink-0" />
            <span>{t("scorecard.titleEuropean", "التقييم المؤسسي الشامل واستمارة 6")}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {t("scorecard.subEuropean", "تقييم احترافي بـ 6 محاور مؤسسية حقيقية (الانضباط، الإنتاجية، الجودة، روح الفريق، السلامة، والمبادرة) مع تصنيف مصفوفة 9-Box وخطط تحسين الأداء PIP.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadEmployees} disabled={loading} className="font-bold">
            <Search className="w-4 h-4 ms-1.5" />
            <span>{t("scorecard.refresh", "تحديث الكفاءات")}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Staff Selection Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-slate-200 rounded-3xl overflow-hidden shadow-xs bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("scorecard.searchPlaceholder", "بحث باسم الموظف أو الوظيفة...")}
                  className="h-10 pe-9 rounded-2xl bg-white font-bold"
                />
              </div>
            </div>

            <div className="max-h-[660px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span>{t("scorecard.analyzing", "جاري تحليل كفاءات الفريق...")}</span>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold">{t("scorecard.noStaff", "لا يوجد موظفون نشطون مطابقة للبحث")}</div>
              ) : (
                filteredStaff.map((emp) => {
                  const isSelected = selectedEmp?.id === emp.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => selectEmployee(emp)}
                      className={`w-full text-start p-4 transition flex items-center justify-between gap-3 ${
                        isSelected ? "bg-indigo-50/80 border-s-4 border-indigo-600" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 border text-slate-700 font-black flex items-center justify-center shrink-0">
                          {emp.full_name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 truncate">{emp.full_name}</div>
                          <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            {emp.job_title || emp.role || t("scorecard.employee", "موظف")}
                          </div>
                        </div>
                      </div>

                      {emp.branches?.name && (
                        <Badge variant="outline" className="text-[10px] shrink-0 font-bold bg-white">
                          {emp.branches.name}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right European 360° Competency Matrix & Action View */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedEmp ? (
            <Card className="p-16 text-center border-dashed rounded-3xl text-slate-400 font-bold">
              <Target className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p>{t("scorecard.selectEmployee", "اختر موظفاً لعرض تقييم الأداء المؤسسي الأوروبي الشامل (6-Pillar Appraisal)")}</p>
            </Card>
          ) : loadingDetails || !stats ? (
            <Card className="p-16 text-center rounded-3xl flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <p className="font-bold text-slate-600">{t("scorecard.loadingDetails", "جاري احتساب محاور الانضباط والإنتاجية والسلامة ومصفوفة 9-Box...")}</p>
            </Card>
          ) : (
            <>
              {/* Top European Profile & 9-Box Classification Banner */}
              <Card className="border-2 border-slate-200 shadow-lg rounded-3xl overflow-hidden bg-white">
                <div className={`p-6 md:p-8 ${stats.gridBoxColor} flex flex-wrap items-center justify-between gap-6`}>
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-mono font-extrabold shadow-inner">
                      <Grid className="w-3.5 h-3.5" />
                      <span>{t("scorecard.boxTitle", "تصنيف 9-Box: ")}{stats.overallScore}%</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black">{selectedEmp.full_name}</h2>
                    <p className="text-sm text-white/90 font-medium flex items-center gap-2">
                      <span>{selectedEmp.job_title || selectedEmp.role || t("scorecard.expert", "خبير تشغيلي")}</span>
                      {selectedEmp.branches?.name && <span>• {t("scorecard.branch", "الفرع: ")}{selectedEmp.branches.name}</span>}
                    </p>
                  </div>

                  <div className="bg-white text-slate-900 p-4 rounded-2xl shadow-xl max-w-sm space-y-1.5 border border-white/40">
                    <div className="font-black text-sm flex items-center gap-1.5 text-indigo-950">
                      <Award className="w-5 h-5 text-indigo-600 shrink-0" />
                      <span>{stats.gridCategory}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">{stats.gridDesc}</p>
                  </div>
                </div>

                <CardContent className="p-6 md:p-8 space-y-6">
                  {/* Action Buttons for European Corporate Decisions */}
                  <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-xs font-black text-slate-700 w-full sm:w-auto">{t("scorecard.actionTitle", "أدوات القرار والتقييم المؤسسي:")}</span>
                    <Button onClick={() => { setActionType("bonus"); setAmount("750"); setReason(t("scorecard.reasonBonusPlaceholder", "مثال: تحقيق 100% في معايير الجودة والالتزام بالحضور لهذا الشهر...")); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs">
                      <Gift className="w-4 h-4 ms-1.5" />
                      <span>{t("scorecard.btnBonus", "صرف حافز تميز (+)")}</span>
                    </Button>

                    <Button onClick={() => { setActionType("deduction"); setAmount("200"); setReason(t("scorecard.reasonPenaltyPlaceholder", "مثال: مخالفة إجراءات السلامة والنظافة SOP أو تأخير بدون إذن...")); }} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 font-black rounded-xl">
                      <MinusCircle className="w-4 h-4 ms-1.5" />
                      <span>{t("scorecard.btnPenalty", "جزاء تقصير SOP (-)")}</span>
                    </Button>

                    <Button onClick={() => setActionType("appraisal_report")} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl">
                      <FileText className="w-4 h-4 ms-1.5" />
                      <span>{t("scorecard.btnReport", "تقرير التقييم المؤسسي 360°")}</span>
                    </Button>

                    <Button onClick={() => setActionType("form6")} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl ms-auto">
                      <AlertTriangle className="w-4 h-4 ms-1.5" />
                      <span>{t("scorecard.btnForm6", "إنذار استمارة 6 (إنهاء الخدمة)")}</span>
                    </Button>
                  </div>

                  {/* 6 European Competency Pillars Breakdown */}
                  <div className="space-y-3">
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" />
                      <span>{t("scorecard.pillarsTitle", "المحاور الستة للتقييم الأوروبي (6-Pillar Competency Framework)")}</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Pillar 1: Operational Discipline */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-teal-600" /> {t("scorecard.p1Title", "1. الانضباط والالتزام")}
                          </span>
                          <Badge className="bg-teal-50 text-teal-800 border-teal-200 font-mono font-black">{stats.disciplineScore}%</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{t("scorecard.p1Desc", "الالتزام بمواعيد الوردية الرسمية (09:00 ص) والرقابة الجغرافية للـ Geofence.")}</p>
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs font-semibold">
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t("scorecard.p1DelayCount", "مرات التأخير عن 09:15 ص:")}</span>
                            <span className={`font-mono font-black ${stats.delayCount > 0 ? "text-red-600" : "text-emerald-600"}`}>{stats.delayCount} {t("scorecard.times", "مرات")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t("scorecard.p1DelayMinutes", "إجمالي دقائق التأخير:")}</span>
                            <span className="font-mono font-black">{stats.delayMinutes} {t("scorecard.minutes", "دقيقة")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pillar 2: Productivity & Output */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-blue-600" /> {t("scorecard.p2Title", "2. الإنتاجية والإنجاز")}
                          </span>
                          <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-mono font-black">{stats.outputScore}%</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{t("scorecard.p2Desc", "حجم إنجاز المهام، سرعة الاستجابة، وتنفيذ معدلات التشغيل المطلوبة.")}</p>
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs font-semibold">
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t("scorecard.p2Shifts", "الورديات المنجزة:")}</span>
                            <span className="font-mono font-black">{stats.totalShifts} {t("common.shift", "وردية")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t("scorecard.p2Bonuses", "حوافز ومكافآت التميز:")}</span>
                            <span className="font-mono font-black text-emerald-600">+{fmtMoney(stats.totalBonuses, t("common.egp", "ج.م"))}</span>
                          </div>
                          {stats.totalTips > 0 && (
                            <div className="flex justify-between text-teal-700">
                              <span>{t("scorecard.p2Tips", "إكراميات وبقشيش عملاء (Driver Tips):")}</span>
                              <span className="font-mono font-black">+{fmtMoney(stats.totalTips, t("common.egp", "ج.م"))}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pillar 3: Quality Assurance */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-indigo-600" /> {t("scorecard.p3Title", "3. الجودة والدقة SOP")}
                          </span>
                          <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200 font-mono font-black">{stats.qualityScore}%</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{t("scorecard.p3Desc", "انعدام المرتجعات التشغيلية، الالتزام بمعايير الفحص، وتفادي الأخطاء.")}</p>
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs font-semibold">
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t("scorecard.p3Deductions", "جزاءات التقصير مسجلة:")}</span>
                            <span className={`font-mono font-black ${stats.totalDeductions > 0 ? "text-red-600" : "text-emerald-600"}`}>
                              -{fmtMoney(stats.totalDeductions, t("common.egp", "ج.م"))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t("scorecard.p3Advances", "سلف مالية جارية:")}</span>
                            <span className="font-mono font-black text-amber-700">-{fmtMoney(stats.totalAdvances, t("common.egp", "ج.م"))}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pillar 4: Teamwork & Collaboration */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                            <HeartHandshake className="w-4 h-4 text-violet-600" /> {t("scorecard.p4Title", "4. روح الفريق والتعاون")}
                          </span>
                          <Badge className="bg-violet-50 text-violet-800 border-violet-200 font-mono font-black">{stats.teamworkScore}%</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{t("scorecard.p4Desc", "التواصل الإيجابي والتنسيق السلس مع المحطات وأعضاء الفريق في أوقات الذروة.")}</p>
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">{t("scorecard.managerRating", "تقييم المدير:")}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} onClick={() => setTeamworkRating(star)} className="focus:outline-hidden">
                                <Star className={`w-4 h-4 ${star <= teamworkRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Pillar 5: HSE & Safety Adherence */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" /> {t("scorecard.p5Title", "5. السلامة والنظافة HSE")}
                          </span>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono font-black">{stats.hseScore}%</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{t("scorecard.p5Desc", "الالتزام بمعايير الأمان، العناية بالمعدات، ونظافة محطة العمل اليومية.")}</p>
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">{t("scorecard.managerRating", "تقييم المدير:")}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} onClick={() => setHseRating(star)} className="focus:outline-hidden">
                                <Star className={`w-4 h-4 ${star <= hseRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Pillar 6: Initiative & Problem Solving */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                            <Lightbulb className="w-4 h-4 text-amber-600" /> {t("scorecard.p6Title", "6. المبادرة والتطوير")}
                          </span>
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 font-mono font-black">{stats.initiativeScore}%</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{t("scorecard.p6Desc", "اقتراح تحسينات للعمل، التعامل الذكي مع المشكلات، واستخدام النظام بكفاءة.")}</p>
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">{t("scorecard.managerRating", "تقييم المدير:")}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} onClick={() => setInitiativeRating(star)} className="focus:outline-hidden">
                                <Star className={`w-4 h-4 ${star <= initiativeRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Development Plan (IDP / PIP Goals) */}
                  <div className="space-y-3 pt-2">
                    <h3 className="font-black text-base text-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-indigo-600" />
                        <span>{t("scorecard.idpTitle", "خطة التطوير وتحسين الأداء المؤسسي (IDP / PIP Objectives)")}</span>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">{t("scorecard.idpQuarter", "الربع الحالي")}</Badge>
                    </h3>

                    <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={newGoalTitle}
                          onChange={(e) => setNewGoalTitle(e.target.value)}
                          placeholder={t("scorecard.idpPlaceholder", "أضف هدفاً تشغيلياً جديداً للموظف...")}
                          className="bg-white rounded-xl h-11 font-bold text-xs"
                          onKeyDown={(e) => e.key === "Enter" && addIdpGoal()}
                        />
                        <Button onClick={addIdpGoal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-5 h-11 shrink-0">
                          <Plus className="w-4 h-4 ms-1" /> {t("scorecard.btnAddGoal", "إضافة هدف")}
                        </Button>
                      </div>

                      <div className="space-y-2 pt-1">
                        {idpGoals.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => toggleGoalStatus(g.id)}
                            className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                              g.status === "achieved" ? "bg-emerald-50/60 border-emerald-200 text-slate-500 line-through" : "bg-white border-slate-200 text-slate-800 font-bold"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className={`w-5 h-5 shrink-0 ${g.status === "achieved" ? "text-emerald-600 fill-emerald-100" : "text-slate-300"}`} />
                              <span className="text-xs">{g.title}</span>
                            </div>
                            <Badge variant={g.status === "achieved" ? "default" : "secondary"} className="text-[10px] font-mono shrink-0">
                              {g.status === "achieved" ? t("scorecard.statusAchieved", "محقَق") : t("scorecard.statusPending", "قيد التنفيذ")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Financial & Discipline Log Table */}
                  <div className="space-y-3 pt-2">
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <BriefcaseBusiness className="w-5 h-5 text-teal-600" />
                      <span>{t("scorecard.ledgerTitle", "سجل الحركات المالية والجزاءات والمكافآت (آخر 30 يوماً)")}</span>
                    </h3>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                          <tr>
                            <th className="p-3 text-start">{t("scorecard.ledgerDescription", "البيان / سبب الحركة")}</th>
                            <th className="p-3 text-start">{t("scorecard.ledgerType", "النوع")}</th>
                            <th className="p-3 text-start">{t("scorecard.ledgerDate", "التاريخ")}</th>
                            <th className="p-3 text-end">{t("scorecard.ledgerAmount", "المبلغ")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {ledger.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">{t("scorecard.ledgerEmpty", "لا توجد حركات مالية أو خصومات مسجلة مؤخراً")}</td>
                            </tr>
                          ) : (
                            ledger.map((l) => {
                              const isDue = l.direction === "employee_due";
                              const isTip = l.source_type === "driver_tip" || (l.description || "").includes("بقشيش");
                              const isBonus = l.entry_type === "adjustment" && isDue && !isTip;
                              const isDeduct = l.entry_type === "adjustment" && !isDue;
                              return (
                                <tr key={l.id} className="hover:bg-slate-50/70">
                                  <td className="p-3 font-bold text-slate-800">{l.description || l.entry_type}</td>
                                  <td className="p-3">
                                    {isTip && <Badge className="bg-teal-600 text-white font-bold">{t("scorecard.badgeTip", "بقشيش عميل (+)")}</Badge>}
                                    {isBonus && <Badge className="bg-emerald-600 text-white font-bold">{t("scorecard.badgeBonus", "حافز تميز (+)")}</Badge>}
                                    {isDeduct && <Badge className="bg-red-600 text-white font-bold">{t("scorecard.badgeDeduct", "جزاء SOP (-)")}</Badge>}
                                    {!isTip && !isBonus && !isDeduct && <Badge variant="outline" className="font-mono">{l.entry_type}</Badge>}
                                  </td>
                                  <td className="p-3 text-slate-500 font-mono">{fmtDate(l.entry_at)}</td>
                                  <td className={`p-3 text-end font-mono font-black ${isDue ? "text-emerald-700" : "text-red-600"}`}>
                                    {isDue ? "+" : "-"}{fmtMoney(l.amount, t("common.egp", "ج.م"))}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Bonus or Deduction Modal */}
      <Dialog open={!!actionType && actionType !== "form6" && actionType !== "appraisal_report"} onOpenChange={(o) => !o && setActionType(null)}>
        <DialogContent className="max-w-md rounded-3xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              {actionType === "bonus" ? <Gift className="w-5 h-5 text-emerald-600" /> : <MinusCircle className="w-5 h-5 text-red-600" />}
              <span>{actionType === "bonus" ? t("scorecard.modalBonusTitle", "صرف حافز تميز أوروبي للموظف") : t("scorecard.modalPenaltyTitle", "إيقاع جزاء عدم الالتزام بالمعايير")}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("scorecard.amountLabel", "المبلغ (جنيه مصري) *")}</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 rounded-xl text-lg font-mono font-black"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">{interpolate(t("scorecard.reasonLabel", "سبب {type} *"), { type: actionType === "bonus" ? t("scorecard.bonus", "الحافز") : t("scorecard.penalty", "الجزاء / الخصم") })}</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={actionType === "bonus" ? t("scorecard.reasonBonusPlaceholder", "مثال: تحقيق 100% في معايير الجودة والالتزام بالحضور لهذا الشهر...") : t("scorecard.reasonPenaltyPlaceholder", "مثال: مخالفة إجراءات السلامة والنظافة SOP أو تأخير بدون إذن...")}
                className="rounded-xl font-medium text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActionType(null)} className="rounded-xl font-bold">
              {t("common.cancel", "إلغاء")}
            </Button>
            <Button onClick={submitAdjustment} disabled={submitting} className={`${actionType === "bonus" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} text-white font-black rounded-xl px-6`}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : actionType === "bonus" ? t("scorecard.btnBonusConfirm", "اعتماد وصرف الحافز") : t("scorecard.btnPenaltyConfirm", "اعتماد وخصم المبلغ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* European 360° Corporate Appraisal Printable Report */}
      <Dialog open={actionType === "appraisal_report"} onOpenChange={(o) => !o && setActionType(null)}>
        <DialogContent className="max-w-3xl rounded-3xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-indigo-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              <span>{t("scorecard.reportTitle", "تقرير التقييم المؤسسي الأوروبي 360° (European Corporate Appraisal)")}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 border-2 border-slate-300 rounded-2xl bg-white space-y-5 font-serif" id="appraisal-print-area">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <img src="/mjrh-logo.png" alt="MJRH" className="w-12 h-12 object-contain" />
                <div>
                  <h3 className="font-black text-base text-slate-900">MJRH INDUSTRIAL REVOLUTION</h3>
                  <p className="text-xs text-slate-500 font-sans">{t("scorecard.reportHeader", "European Corporate Competency & Appraisal Document")}</p>
                </div>
              </div>
              <div className="text-end font-sans text-xs font-bold text-slate-600">
                <div>{t("scorecard.reportEvalDate", "تاريخ التقييم: ")} <span className="font-mono">{new Date().toISOString().slice(0, 10)}</span></div>
                <Badge className="bg-indigo-600 text-white font-mono mt-1">SaaS V2.0 Certified</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border text-xs font-sans font-bold text-slate-800">
              <div>{t("scorecard.reportEmployee", "الموظف: ")} <span className="font-black text-indigo-950 text-sm">{selectedEmp?.full_name}</span></div>
              <div>{t("scorecard.reportJob", "المسمى الوظيفي: ")} <span className="font-black">{selectedEmp?.job_title || selectedEmp?.role || t("scorecard.expert", "خبير تشغيلي")}</span></div>
              <div>{t("scorecard.reportBranch", "الفرع التشغيلي: ")} <span className="font-black">{selectedEmp?.branches?.name || t("scorecard.mainBranch", "الفرع الرئيسي")}</span></div>
              <div>{t("scorecard.reportClassification", "التصنيف المؤسسي (9-Box): ")} <span className="font-black text-indigo-700">{stats?.gridCategory}</span></div>
            </div>

            <div className="space-y-3 font-sans">
              <h4 className="font-black text-sm text-slate-900 border-b pb-1">{t("scorecard.reportResults", "نتائج تفقيط المحاور الستة للتميز المؤسسي:")}</h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                <div className="flex justify-between p-2 rounded-lg bg-teal-50/60 border">
                  <span>{t("scorecard.p1Title", "1. الانضباط والالتزام الميداني:")}</span>
                  <span className="font-mono font-black text-teal-800">{stats?.disciplineScore}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-blue-50/60 border">
                  <span>{t("scorecard.p2Title", "2. الإنتاجية وحجم إنجاز المهام:")}</span>
                  <span className="font-mono font-black text-blue-800">{stats?.outputScore}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-indigo-50/60 border">
                  <span>{t("scorecard.p3Title", "3. الجودة والدقة التشغيلية SOP:")}</span>
                  <span className="font-mono font-black text-indigo-800">{stats?.qualityScore}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-violet-50/60 border">
                  <span>{t("scorecard.p4Title", "4. التعاون وروح الفريق المؤسسي:")}</span>
                  <span className="font-mono font-black text-violet-800">{stats?.teamworkScore}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-emerald-50/60 border">
                  <span>{t("scorecard.p5Title", "5. السلامة والصحة المهنية HSE:")}</span>
                  <span className="font-mono font-black text-emerald-800">{stats?.hseScore}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-amber-50/60 border">
                  <span>{t("scorecard.p6Title", "6. المبادرة والتطوير الذاتي:")}</span>
                  <span className="font-mono font-black text-amber-800">{stats?.initiativeScore}%</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center text-sm font-black font-mono">
                <span>{t("scorecard.reportOverall", "التقييم الأوروبي العام الموزون (Overall 360° Grade):")}</span>
                <span className="text-emerald-400 text-base">{stats?.overallScore}%</span>
              </div>
            </div>

            <div className="space-y-2 font-sans text-xs">
              <h4 className="font-black text-slate-900">{t("scorecard.reportIdp", "الأهداف التطويرية المعتمدة للربع الحالي (IDP / PIP):")}</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-700 font-semibold pe-4">
                {idpGoals.map((g) => (
                  <li key={g.id}>
                    {g.title} — <span className="font-mono text-slate-500">({g.status === "achieved" ? t("scorecard.statusAchieved", "محقَق") : t("scorecard.statusPending", "قيد التنفيذ")})</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs font-bold border-t mt-6 font-sans">
              <div>
                <p className="mb-8 text-slate-500">{t("scorecard.reportSignEmployee", "توقيع الموظف (بالعلم والإقرار):")}</p>
                <div className="border-b border-dashed border-slate-400 w-36 mx-auto" />
              </div>
              <div>
                <p className="mb-8 text-slate-500">{t("scorecard.reportSignAdmin", "اعتماد إدارة الموارد البشرية والتشغيل:")}</p>
                <div className="border-b border-dashed border-slate-400 w-36 mx-auto" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setActionType(null)} className="rounded-xl font-bold">
              {t("common.close", "إغلاق")}
            </Button>
            <Button onClick={printDocument} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-6">
              <Printer className="w-4 h-4 ms-1.5" />
              <span>{t("scorecard.btnPrint", "طبع التقرير المعتمد")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form 6 / Official Termination Modal */}
      <Dialog open={actionType === "form6"} onOpenChange={(o) => !o && setActionType(null)}>
        <DialogContent className="max-w-2xl rounded-3xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              <span>{t("scorecard.form6Title", "إصدار إنذار نهائي / استمارة 6 إنهاء خدمة")}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 border-2 border-slate-300 rounded-2xl bg-white space-y-4 font-serif" id="form6-print-area">
            <div className="text-center border-b pb-4 space-y-1">
              <h3 className="font-black text-lg text-slate-900">{t("scorecard.form6Header", "إشعار إداري / إنهاء تعاقد (استمارة رقم 6)")}</h3>
              <p className="text-xs text-slate-500">{t("scorecard.form6Sub", "صادر عن إدارة الموارد البشرية والتشغيل بـ MJRH INDUSTRIAL REVOLUTION")}</p>
            </div>

            <div className="space-y-2 text-sm leading-7 text-slate-800 font-medium">
              <p>
                {t("scorecard.form6Body", "بناءً على التقييم الدوري الشامل لبيانات الحضور والانصراف وإنجاز المهام للعام الحالي، تم مراجعة أداء الموظف:")}
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border font-bold space-y-1 text-xs">
                <div>{t("scorecard.form6SummaryName", "الاسم الكامل: ")} <span className="font-black text-slate-900">{selectedEmp?.full_name}</span></div>
                <div>{t("scorecard.form6SummaryJob", "المسمى الوظيفي: ")} <span className="font-black">{selectedEmp?.job_title || selectedEmp?.role || t("scorecard.employee", "موظف")}</span></div>
                <div>{t("scorecard.form6SummaryScore", "التقييم العام للأداء 360°: ")} <span className="font-black font-mono text-red-600">{stats?.overallScore}%{t("scorecard.form6ScoreLow", " (أقل من المستوى المطلوب)")}</span></div>
                <div>{t("scorecard.form6SummaryDelays", "عدد مرات التأخير عن مواعيد العمل: ")} <span className="font-black font-mono text-red-600">{interpolate(t("scorecard.form6DelayDetail", " مرات ({minutes} دقيقة تأخير)"), { minutes: stats?.delayMinutes })}</span></div>
              </div>
              <p className="text-xs text-red-800 font-bold bg-red-50 p-3 rounded-xl border border-red-200">
                {t("scorecard.form6FinalNotice", "تقرر إخطار الموظف بهذا الإنذار النهائي نظراً لتكرار التأخيرات والغياب أو انخفاض الإنتاجية دون تبرير مقبول، ويعتبر هذا المستند إقراراً إدارياً يمهد لإصدار استمارة (6) للتأمينات الاجتماعية وإنهاء الخدمة طبقاً للوائح العمل.")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs font-bold border-t mt-6">
              <div>
                <p className="mb-8 text-slate-500">{t("scorecard.form6SignEmployee", "توقيع الموظف (بالعلم):")}</p>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
              </div>
              <div>
                <p className="mb-8 text-slate-500">{t("scorecard.form6SignAdmin", "اعتماد مالك النشاط / الإدارة:")}</p>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setActionType(null)} className="rounded-xl font-bold">
              {t("common.close", "إغلاق")}
            </Button>
            <Button onClick={printDocument} className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl px-6">
              <Printer className="w-4 h-4 ms-1.5" />
              <span>{t("scorecard.btnForm6Print", "طباعة استمارة 6 / الإنذار")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
