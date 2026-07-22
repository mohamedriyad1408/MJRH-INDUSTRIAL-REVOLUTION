import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
  Star, Grid, Layers, Zap, HeartHandshake, Lightbulb, GraduationCap, Edit, Trash2
} from "lucide-react";

export const Route = createFileRoute("/_app/staff/scorecard")({
  head: () => ({ meta: [{ title: "Scorecard - MJRH" }] }),
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
  entry_at: string;
};

type IdpGoal = {
  id: string;
  title: string;
  targetDate: string;
  status: "pending" | "achieved";
};

function computeEuropeanAppraisal(
  t: any,
  emp: Employee,
  att: AttendanceRecord[],
  ledger: LedgerEntry[],
  teamworkRating: number,
  hseRating: number,
  initiativeRating: number
) {
  const totalShifts = att.length;
  let delayCount = 0;
  let delayMinutes = 0;

  att.forEach((r: any) => {
    try {
      const officialStart = new Date(`${r.work_date}T09:00:00`).getTime();
      const actualStart = new Date(r.check_in_at).getTime();
      if (actualStart > officialStart + (15 * 60 * 1000)) {
        delayCount++;
        delayMinutes += Math.floor((actualStart - officialStart) / (1000 * 60));
      }
    } catch {}
  });

  const disciplineScore = Math.max(0, 100 - (delayCount * 5 + Math.floor(delayMinutes / 10)));
  let totalBonuses = 0;
  let totalDeductions = 0;

  ledger.forEach((l: any) => {
    const amt = Number(l.amount || 0);
    if (l.direction === "employee_due") {
      if (l.entry_type === "adjustment" || (l.description || "").includes(t("common.bonus"))) totalBonuses += amt;
    } else {
      if (l.entry_type === "adjustment" || (l.description || "").includes(t("common.deduction"))) totalDeductions += amt;
    }
  });

  let outputScore = Math.min(100, 75 + (totalShifts * 2) + (totalBonuses > 0 ? 10 : 0));
  let qualityScore = Math.max(20, 90 - Math.floor(totalDeductions / 10));

  const overallScore = Math.round(
    disciplineScore * 0.20 + outputScore * 0.25 + qualityScore * 0.20 +
    (teamworkRating * 20) * 0.15 + (hseRating * 20) * 0.10 + (initiativeRating * 20) * 0.10
  );

  let gridCategory = t("scorecard.grid.consistent");
  let gridDesc = t("scorecard.grid.consistentDesc");
  let gridColor = "bg-blue-600";

  if (overallScore >= 88) {
    gridCategory = t("scorecard.grid.star");
    gridDesc = t("scorecard.grid.starDesc");
    gridColor = "bg-emerald-600";
  } else if (overallScore >= 75) {
    gridCategory = t("scorecard.grid.performer");
    gridDesc = t("scorecard.grid.performerDesc");
    gridColor = "bg-teal-600";
  } else if (overallScore < 45) {
    gridCategory = t("scorecard.grid.exit");
    gridDesc = t("scorecard.grid.exitDesc");
    gridColor = "bg-red-600";
  }

  return { overallScore, gridCategory, gridDesc, gridColor, disciplineScore, outputScore, qualityScore, delayCount, delayMinutes, totalShifts };
}

function EuropeanScorecardPage() {
  const { tenantId, hasRole, user } = useAuth();
  const { t, dir } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamwork, setTeamwork] = useState(4);
  const [hse, setHse] = useState(4);
  const [initiative, setInitiative] = useState(3);
  const [actionType, setActionType] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase.from("employees").select("*, branches(name)").eq("tenant_id", tenantId).eq("is_active", true).order("full_name");
    setEmployees((data ?? []) as any[]);
    if (data?.length && !selectedEmp) selectEmployee(data[0] as any);
    setLoading(false);
  }, [tenantId]);

  async function selectEmployee(emp: Employee) {
    setSelectedEmp(emp);
    const { data: att } = await supabase.from("employee_attendance").select("*").eq("employee_id", emp.id).limit(30);
    const { data: led } = await supabase.from("employee_financial_ledger").select("*").eq("employee_id", emp.id).limit(30);
    setAttendance(att ?? []);
    setLedger(led ?? []);
  }

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    if (!selectedEmp) return null;
    return computeEuropeanAppraisal(t, selectedEmp, attendance, ledger, teamwork, hse, initiative);
  }, [selectedEmp, attendance, ledger, teamwork, hse, initiative, t]);

  const filtered = employees.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase()));

  async function submitAdjustment() {
    if (!selectedEmp || !amount || !reason) return toast.error(t("finance.errReqFields"));
    setSubmitting(true);
    const { error } = await supabase.from("employee_financial_ledger").insert({
      tenant_id: tenantId, employee_id: selectedEmp.id, entry_type: "adjustment",
      amount: Number(amount), direction: actionType === "bonus" ? "employee_due" : "employee_owes",
      description: (actionType === "bonus" ? "[BONUS] " : "[PENALTY] ") + reason,
      created_by: user?.id
    });
    setSubmitting(false);
    if (error) toast.error(error.message); else { toast.success(t("common.save")); setActionType(null); selectEmployee(selectedEmp); }
  }

  if (!hasRole("owner", "ops_manager")) return <Card className="p-10 text-center">{t("reports.noAccess")}</Card>;

  return (
    <div className="space-y-6" dir={dir}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
            <Award className="w-3.5 h-3.5" />
            <span>{t("scorecard.badgeEuropean")}</span>
          </div>
          <h1 className="text-2xl font-black">{t("scorecard.titleEuropean")}</h1>
        </div>
      </header>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        <Card className="h-fit">
          <CardHeader className="pb-3"><div className="relative"><Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("scorecard.searchPlaceholder")} className="pr-9" /></div></CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            {filtered.map(e => (
              <button key={e.id} onClick={() => selectEmployee(e)} className={`w-full text-start p-3 border-b last:border-0 hover:bg-slate-50 transition ${selectedEmp?.id === e.id ? "bg-indigo-50 border-r-4 border-r-indigo-600" : ""}`}>
                <div className="font-bold text-sm">{e.full_name}</div>
                <div className="text-[10px] text-muted-foreground">{e.job_title}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selectedEmp && stats && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-indigo-900 text-white"><CardContent className="p-4">
                <div className="text-xs opacity-70">{t("scorecard.labelOverallScore")}</div>
                <div className="text-3xl font-black mt-1">{stats.overallScore}%</div>
              </CardContent></Card>
              <Card className={`${stats.gridColor} text-white md:col-span-2`}><CardContent className="p-4">
                <div className="text-xs opacity-70">{t("scorecard.labelGrid")}</div>
                <div className="text-xl font-black mt-1">{stats.gridCategory}</div>
                <div className="text-[10px] mt-1 opacity-80">{stats.gridDesc}</div>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-indigo-600" />{t("scorecard.pillarsTitle")}</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <Pillar label={t("scorecard.pillar1Title")} score={stats.disciplineScore} detail={interpolate(t("scorecard.lateCount"), { count: stats.delayCount })} color="bg-teal-500" />
                <Pillar label={t("scorecard.pillar2Title")} score={stats.outputScore} detail={interpolate(t("scorecard.shiftsCompleted"), { count: stats.totalShifts })} color="bg-blue-500" />
                <Pillar label={t("scorecard.pillar3Title")} score={stats.qualityScore} detail={t("scorecard.pillar3Desc")} color="bg-indigo-500" />
                <div className="space-y-2">
                  <Label className="text-xs font-bold">{t("scorecard.pillar4Title")}</Label>
                  <div className="flex gap-1">{[1,2,3,4,5].map(v => <Star key={v} className={`w-5 h-5 cursor-pointer ${v <= teamwork ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} onClick={() => setTeamwork(v)} />)}</div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionType("bonus")} className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"><Gift className="w-4 h-4 ms-2" />{t("scorecard.bonusBtn")}</Button>
              <Button variant="outline" onClick={() => setActionType("deduction")} className="border-red-600 text-red-700 hover:bg-red-50"><MinusCircle className="w-4 h-4 ms-2" />{t("scorecard.penaltyBtn")}</Button>
              <Button onClick={() => window.print()} className="bg-slate-900"><Printer className="w-4 h-4 ms-2" />{t("scorecard.btnPrint")}</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!actionType && actionType !== "print"} onOpenChange={() => setActionType(null)}>
        <DialogContent className="rounded-3xl max-w-md" dir={dir}>
          <DialogHeader><DialogTitle className="text-lg font-black">{actionType === "bonus" ? t("scorecard.modalBonusTitle") : t("scorecard.modalPenaltyTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>{t("scorecard.labelAmount")}</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div><Label>{t("common.reason")}</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={actionType === "bonus" ? t("scorecard.placeholderBonus") : t("scorecard.placeholderPenalty")} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActionType(null)}>{t("common.cancel")}</Button>
            <Button onClick={submitAdjustment} disabled={submitting} className={actionType === "bonus" ? "bg-emerald-600" : "bg-red-600"}>{submitting ? <Loader2 className="animate-spin" /> : t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Pillar({ label, score, detail, color }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end"><Label className="text-xs font-bold">{label}</Label><span className="text-[10px] font-black">{score}%</span></div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${color} transition-all`} style={{ width: `${score}%` }} /></div>
      <div className="text-[10px] text-muted-foreground">{detail}</div>
    </div>
  );
}
