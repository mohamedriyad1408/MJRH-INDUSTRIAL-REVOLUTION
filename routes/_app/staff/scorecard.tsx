import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
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
} from "lucide-react";

export const Route = createFileRoute("/_app/staff/scorecard")({
  head: () => ({ meta: [{ title: "تقييم الأداء واستمارة 6 — Scorecard" }] }),
  component: StaffScorecardPage,
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
  entry_at: string;
};

function computeScorecard(emp: Employee, att: AttendanceRecord[], ledger: LedgerEntry[]) {
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

  const attPenalty = delayCount * 5 + Math.floor(delayMinutes / 10);
  const attScore = Math.max(0, Math.min(100, 100 - attPenalty));

  let totalEarned = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;
  let totalAdvances = 0;

  ledger.forEach((l) => {
    const amt = Number(l.amount || 0);
    if (l.direction === "employee_due") {
      totalEarned += amt;
      if (l.entry_type === "adjustment" || (l.description || "").includes("مكافأة")) totalBonuses += amt;
    } else {
      if (l.entry_type === "advance") totalAdvances += amt;
      else if (l.entry_type === "adjustment" || (l.description || "").includes("خصم")) totalDeductions += amt;
    }
  });

  let prodScore = 75 + Math.min(15, totalShifts * 2);
  if (totalBonuses > 0) prodScore = Math.min(100, prodScore + 10);
  if (totalDeductions > 200) prodScore = Math.max(20, prodScore - 20);

  const overallScore = Math.round(attScore * 0.4 + prodScore * 0.6);

  let badge = {
    label: "أداء استثنائي — مستحق لمكافأة أو ترقية",
    color: "bg-emerald-600 text-white",
    tone: "emerald",
    desc: "التزام تام بمواعيد الحضور وإنتاجية عالية. يُنصح بمنحه مكافأة إنجاز تشجيعية.",
    actionRecommendation: "bonus",
  };

  if (overallScore < 50) {
    badge = {
      label: "إنذار أحمر — استمارة 6 (إنهاء تعاقد)",
      color: "bg-red-600 text-white animate-pulse",
      tone: "red",
      desc: "تأخيرات متكررة أو انعدام إنتاجية وخصومات مستمرة. يُنصح بإصدار استمارة 6 وإنهاء الخدمة.",
      actionRecommendation: "form6",
    };
  } else if (overallScore < 70) {
    badge = {
      label: "يحتاج متابعة وتنبيه إداري",
      color: "bg-amber-500 text-white",
      tone: "amber",
      desc: "يوجد تأخيرات في المواعيد أو تراجع في الأداء، يُنصح بلفت نظر أو جلسة توجيه.",
      actionRecommendation: "warning",
    };
  } else if (overallScore < 85) {
    badge = {
      label: "أداء موثوق ومستقر",
      color: "bg-blue-600 text-white",
      tone: "blue",
      desc: "موظف مجتهد وملتزم بمهامه اليومية ومواعيده الرسمية بانتظام.",
      actionRecommendation: "normal",
    };
  }

  return {
    totalShifts,
    delayCount,
    delayMinutes,
    attScore,
    prodScore,
    overallScore,
    totalEarned,
    totalDeductions,
    totalBonuses,
    totalAdvances,
    badge,
  };
}

function StaffScorecardPage() {
  const { tenantId, hasRole } = useAuth();
  const { t, dir } = useI18n();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [search, setSearch] = useState("");

  // Modals for financial adjustment & Form 6
  const [actionType, setActionType] = useState<"bonus" | "deduction" | "form6" | null>(null);
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
      const list = (data ?? []) as Employee[];
      setEmployees(list);
      if (list.length > 0 && !selectedEmp) {
        selectEmployee(list[0]);
      }
    } catch (err: any) {
      toast.error(err?.message || "خطأ في تحميل الموظفين");
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
          .select("id, entry_type, amount, direction, description, entry_at")
          .eq("tenant_id", tenantId)
          .eq("employee_id", emp.id)
          .order("entry_at", { ascending: false })
          .limit(30),
      ]);

      setAttendance((attRes.data ?? []) as AttendanceRecord[]);
      setLedger((ledRes.data ?? []) as LedgerEntry[]);
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تحميل تفاصيل الموظف");
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
    return computeScorecard(selectedEmp, attendance, ledger);
  }, [selectedEmp, attendance, ledger]);

  async function submitAdjustment() {
    if (!selectedEmp || !actionType || actionType === "form6") return;
    const val = Number(amount);
    if (!val || val <= 0) return toast.error("أدخل مبلغاً صحيحاً أكبر من صفر");
    if (!reason.trim()) return toast.error("اكتب سبب المكافأة أو الخصم");

    setSubmitting(true);
    try {
      const direction = actionType === "bonus" ? "employee_due" : "employee_owes";
      const descPrefix = actionType === "bonus" ? "مكافأة تشجيعية / إنجاز: " : "خصم / جزاء إداري: ";

      const { error } = await supabase.from("employee_financial_ledger").insert({
        tenant_id: tenantId,
        employee_id: selectedEmp.id,
        entry_type: "adjustment",
        amount: val,
        direction,
        description: `${descPrefix}${reason.trim()}`,
        source_type: "hr_scorecard",
      });

      if (error) throw error;
      toast.success(actionType === "bonus" ? "تم صرف المكافأة وإضافتها لحساب الموظف" : "تم إيقاع الخصم على حساب الموظف");
      setActionType(null);
      setAmount("");
      setReason("");
      selectEmployee(selectedEmp);
    } catch (err: any) {
      toast.error(err?.message || "فشل تسجيل الحركة المالية");
    } finally {
      setSubmitting(false);
    }
  }

  function printForm6() {
    window.print();
  }

  if (!isManager) {
    return <Card className="p-8 text-center text-slate-500 font-bold">صلاحية هذه الصفحة مخصصة لمالك النشاط ومديري التشغيل فقط.</Card>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20" dir={dir}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>{t("scorecard.badge", "ذكاء الموارد البشرية التنبؤي — 360° HR Intelligence")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Target className="w-8 h-8 text-teal-600 shrink-0" />
            <span>{t("scorecard.title", "تقييم الأداء والمكافآت واستمارة 6")}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {t("scorecard.subtitle", "رؤية 360 درجة لكل موظف تجمع بين الالتزام بالحضور والانصراف، الإنتاجية وإنجاز المهام، مع خوارزمية ذكية لاقتراح المكافأة أو إنهاء الخدمة.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadEmployees} disabled={loading} className="font-bold">
            <Search className="w-4 h-4 ms-1.5" />
            <span>{t("common.refresh", "تحديث البيانات")}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Staff Selection Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-slate-200 rounded-3xl overflow-hidden shadow-xs bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث باسم الموظف أو الوظيفة..."
                  className="h-10 pe-9 rounded-2xl bg-white font-bold"
                />
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  <span>جاري تحميل الموظفين...</span>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold">لا يوجد موظفون نشطون مطابقة للبحث</div>
              ) : (
                filteredStaff.map((emp) => {
                  const isSelected = selectedEmp?.id === emp.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => selectEmployee(emp)}
                      className={`w-full text-start p-4 transition flex items-center justify-between gap-3 ${
                        isSelected ? "bg-teal-50/80 border-s-4 border-teal-600" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 border text-slate-700 font-black flex items-center justify-center shrink-0">
                          {emp.full_name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 truncate">{emp.full_name}</div>
                          <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            {emp.job_title || emp.role || "موظف"}
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

        {/* Right 360° Scorecard & Action View */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedEmp ? (
            <Card className="p-16 text-center border-dashed rounded-3xl text-slate-400 font-bold">
              <Target className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p>اختر موظفاً من القائمة الجانبية لعرض بطاقة تقييم الأداء الشاملة (360° Scorecard)</p>
            </Card>
          ) : loadingDetails || !stats ? (
            <Card className="p-16 text-center rounded-3xl flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
              <p className="font-bold text-slate-600">جاري تحليل بيانات الالتزام والإنتاجية والحساب الجاري...</p>
            </Card>
          ) : (
            <>
              {/* Employee Top Profile & Algorithmic Recommendation Banner */}
              <Card className="border-2 border-slate-200 shadow-md rounded-3xl overflow-hidden bg-white">
                <div className={`p-6 md:p-8 ${stats.badge.color} flex flex-wrap items-center justify-between gap-6`}>
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-mono font-extrabold">
                      <span>الأداء العام 360°:</span>
                      <span className="text-sm font-black">{stats.overallScore}%</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black">{selectedEmp.full_name}</h2>
                    <p className="text-sm text-white/90 font-medium flex items-center gap-2">
                      <span>{selectedEmp.job_title || selectedEmp.role || "موظف تشغيلي"}</span>
                      {selectedEmp.branches?.name && <span>• الفرع: {selectedEmp.branches.name}</span>}
                    </p>
                  </div>

                  <div className="bg-white text-slate-900 p-4 rounded-2xl shadow-lg max-w-sm space-y-1.5 border border-white/40">
                    <div className="font-black text-sm flex items-center gap-1.5">
                      {stats.badge.tone === "emerald" && <Award className="w-5 h-5 text-emerald-600" />}
                      {stats.badge.tone === "red" && <AlertTriangle className="w-5 h-5 text-red-600" />}
                      {stats.badge.tone === "amber" && <Clock className="w-5 h-5 text-amber-600" />}
                      {stats.badge.tone === "blue" && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                      <span>{stats.badge.label}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{stats.badge.desc}</p>
                  </div>
                </div>

                <CardContent className="p-6 md:p-8 space-y-6">
                  {/* Action Buttons for HR Decisions */}
                  <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-600 w-full sm:w-auto">القرارات الإدارية الفورية:</span>
                    <Button onClick={() => { setActionType("bonus"); setAmount("500"); setReason("مكافأة تشجيعية للالتزام والإنتاجية الممتازة"); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs">
                      <Gift className="w-4 h-4 ms-1.5" />
                      <span>صرف مكافأة إنجاز (+)</span>
                    </Button>

                    <Button onClick={() => { setActionType("deduction"); setAmount("150"); setReason("خصم إداري لتكرار التأخيرات أو تقصير تشغيلي"); }} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 font-black rounded-xl">
                      <MinusCircle className="w-4 h-4 ms-1.5" />
                      <span>إيقاع جزاء / خصم (-)</span>
                    </Button>

                    <Button onClick={() => setActionType("form6")} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl ms-auto">
                      <FileText className="w-4 h-4 ms-1.5" />
                      <span>إصدار إنذار / استمارة 6</span>
                    </Button>
                  </div>

                  {/* 3 Pillars Score Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Pillar 1: Attendance & Delays */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-teal-600" /> الالتزام والتأخير
                        </span>
                        <Badge className="bg-teal-50 text-teal-800 border-teal-200 font-mono font-black">{stats.attScore}%</Badge>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">أيام الحضور مسجلة:</span>
                          <span className="font-black text-slate-900 font-mono">{stats.totalShifts} شفت</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">مرات التأخير عن 09:15 ص:</span>
                          <span className={`font-black font-mono ${stats.delayCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                            {stats.delayCount} مرات
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">مجموع دقائق التأخير:</span>
                          <span className={`font-black font-mono ${stats.delayMinutes > 30 ? "text-red-600" : "text-slate-700"}`}>
                            {stats.delayMinutes} دقيقة
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pillar 2: Task Output & Productivity */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-blue-600" /> إنجاز المهام
                        </span>
                        <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-mono font-black">{stats.prodScore}%</Badge>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">الراتب الأساسي:</span>
                          <span className="font-black font-mono text-slate-900">{fmtMoney(selectedEmp.monthly_salary || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">نسبة عمولة الإنتاج:</span>
                          <span className="font-black font-mono text-indigo-600">{selectedEmp.commission_percent || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">مكافآت مضافة:</span>
                          <span className="font-black font-mono text-emerald-600">+{fmtMoney(stats.totalBonuses)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pillar 3: Financial Balance & Deductions */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" /> الوضع المالي
                        </span>
                        <Badge variant="outline" className="font-mono text-[11px] font-bold">جاري الموظف</Badge>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">إجمالي المستحق (رواتب):</span>
                          <span className="font-black font-mono text-emerald-700">+{fmtMoney(stats.totalEarned)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">خصومات وجزاءات تأخير:</span>
                          <span className={`font-black font-mono ${stats.totalDeductions > 0 ? "text-red-600" : "text-slate-600"}`}>
                            -{fmtMoney(stats.totalDeductions)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">سلف مسحوبة:</span>
                          <span className="font-black font-mono text-amber-700">-{fmtMoney(stats.totalAdvances)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Financial & Discipline Log Table */}
                  <div className="space-y-3 pt-2">
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <BriefcaseBusiness className="w-5 h-5 text-teal-600" />
                      <span>سجل الحركات المالية والجزاءات والمكافآت (آخر 30 يوماً)</span>
                    </h3>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
                          <tr>
                            <th className="p-3 text-start">البيان / سبب الحركة</th>
                            <th className="p-3 text-start">النوع</th>
                            <th className="p-3 text-start">التاريخ</th>
                            <th className="p-3 text-end">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {ledger.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">لا توجد حركات مالية أو خصومات مسجلة مؤخراً</td>
                            </tr>
                          ) : (
                            ledger.map((l) => {
                              const isDue = l.direction === "employee_due";
                              const isBonus = l.entry_type === "adjustment" && isDue;
                              const isDeduct = l.entry_type === "adjustment" && !isDue;
                              return (
                                <tr key={l.id} className="hover:bg-slate-50/70">
                                  <td className="p-3 font-bold text-slate-800">{l.description || l.entry_type}</td>
                                  <td className="p-3">
                                    {isBonus && <Badge className="bg-emerald-600 text-white font-bold">مكافأة (+)</Badge>}
                                    {isDeduct && <Badge className="bg-red-600 text-white font-bold">خصم جزاء (-)</Badge>}
                                    {!isBonus && !isDeduct && <Badge variant="outline" className="font-mono">{l.entry_type}</Badge>}
                                  </td>
                                  <td className="p-3 text-slate-500 font-mono">{fmtDate(l.entry_at)}</td>
                                  <td className={`p-3 text-end font-mono font-black ${isDue ? "text-emerald-700" : "text-red-600"}`}>
                                    {isDue ? "+" : "-"}{fmtMoney(l.amount)}
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
      <Dialog open={!!actionType && actionType !== "form6"} onOpenChange={(o) => !o && setActionType(null)}>
        <DialogContent className="max-w-md rounded-3xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              {actionType === "bonus" ? <Gift className="w-5 h-5 text-emerald-600" /> : <MinusCircle className="w-5 h-5 text-red-600" />}
              <span>{actionType === "bonus" ? "صرف مكافأة / علاوة إنجاز للموظف" : "إيقاع خصم تأخير / جزاء إداري على الموظف"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">المبلغ (جنيه مصري) *</Label>
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
              <Label className="text-xs font-bold text-slate-700 mb-1 block">سبب {actionType === "bonus" ? "المكافأة" : "الخصم / الجزاء"} *</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={actionType === "bonus" ? "مثال: التزام تام بالحضور وإنتاجية عالية هذا الأسبوع..." : "مثال: تأخير 3 ساعات عن الميعاد الرسمي أو تقصير تشغيلي..."}
                className="rounded-xl font-medium text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActionType(null)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button onClick={submitAdjustment} disabled={submitting} className={`${actionType === "bonus" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} text-white font-black rounded-xl px-6`}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : actionType === "bonus" ? "اعتماد وصرف المكافأة" : "اعتماد وخصم المبلغ"}
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
              <span>إصدار إنذار نهائي / استمارة 6 إنهاء خدمة</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 border-2 border-slate-300 rounded-2xl bg-white space-y-4 font-serif" id="form6-print-area">
            <div className="text-center border-b pb-4 space-y-1">
              <h3 className="font-black text-lg text-slate-900">إشعار إداري / إنهاء تعاقد (استمارة رقم 6)</h3>
              <p className="text-xs text-slate-500">صادر عن إدارة الموارد البشرية والتشغيل بـ MJRH INDUSTRIAL REVOLUTION</p>
            </div>

            <div className="space-y-2 text-sm leading-7 text-slate-800 font-medium">
              <p>
                بناءً على التقييم الدوري الشامل لبيانات الحضور والانصراف وإنجاز المهام للعام الحالي، تم مراجعة أداء الموظف:
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border font-bold space-y-1 text-xs">
                <div>الاسم الكامل: <span className="font-black text-slate-900">{selectedEmp?.full_name}</span></div>
                <div>المسمى الوظيفي: <span className="font-black">{selectedEmp?.job_title || selectedEmp?.role || "موظف"}</span></div>
                <div>التقييم العام للأداء 360°: <span className="font-black font-mono text-red-600">{stats?.overallScore}% (أقل من المستوى المطلوب)</span></div>
                <div>عدد مرات التأخير عن مواعيد العمل: <span className="font-black font-mono text-red-600">{stats?.delayCount} مرات ({stats?.delayMinutes} دقيقة تأخير)</span></div>
              </div>
              <p className="text-xs text-red-800 font-bold bg-red-50 p-3 rounded-xl border border-red-200">
                ⚠️ تقرر إخطار الموظف بهذا الإنذار النهائي نظراً لتكرار التأخيرات والغياب أو انخفاض الإنتاجية دون تبرير مقبول، ويعتبر هذا المستند إقراراً إدارياً يمهد لإصدار استمارة (6) للتأمينات الاجتماعية وإنهاء الخدمة طبقاً للوائح العمل.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs font-bold border-t mt-6">
              <div>
                <p className="mb-8 text-slate-500">توقيع الموظف (بالعلم):</p>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
              </div>
              <div>
                <p className="mb-8 text-slate-500">اعتماد مالك النشاط / الإدارة:</p>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setActionType(null)} className="rounded-xl font-bold">
              إغلاق
            </Button>
            <Button onClick={printForm6} className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl px-6">
              <Printer className="w-4 h-4 ms-1.5" />
              <span>طباعة استمارة 6 / الإنذار</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
