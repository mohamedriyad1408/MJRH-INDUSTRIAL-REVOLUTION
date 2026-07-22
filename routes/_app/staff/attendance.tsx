import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { interpolate, useI18n } from "@/lib/i18n";
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
  Clock, LogIn, LogOut, MapPin, Loader2, Plus, Search,
  Calendar, UserCheck, UserX, AlertTriangle, CheckCircle2,
  Trash2, Edit, ShieldCheck, Sparkles, Building2, BriefcaseBusiness,
} from "lucide-react";

export const Route = createFileRoute("/_app/staff/attendance")({
  head: () => ({ meta: [{ title: "Attendance - Mawared HR" }] }),
  component: AttendanceMawaredPage,
});

type Employee = {
  id: string;
  full_name: string;
  job_title?: string | null;
  station?: string | null;
  role?: string | null;
  is_active?: boolean;
  branches?: { name?: string };
};

type AttendanceRecord = {
  id: string;
  employee_id: string;
  work_date: string;
  check_in_at: string;
  check_out_at?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  notes?: string | null;
  employees?: Employee;
};

function formatTime(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return d;
  }
}

function calculateDuration(checkIn: string, checkOut?: string | null) {
  try {
    const start = new Date(checkIn).getTime();
    const end = checkOut ? new Date(checkOut).getTime() : Date.now();
    const diffMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return { hours, mins, text: `${hours} س و ${mins} د`, totalMinutes: diffMinutes };
  } catch {
    return { hours: 0, mins: 0, text: "—", totalMinutes: 0 };
  }
}

function AttendanceMawaredPage() {
  const { tenantId, hasRole, user } = useAuth();
  const { t, dir } = useI18n();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  const [busyMyShift, setBusyMyShift] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "present" | "checked_out" | "absent">("all");

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isManager = hasRole("owner", "ops_manager", "cs_manager", "super_admin");

  async function loadData() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [empRes, attRes, myEmpRes] = await Promise.all([
        supabase
          .from("employees")
          .select("id, full_name, job_title, station, role, is_active, branches(name)")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("full_name"),
        supabase
          .from("employee_attendance")
          .select("*, employees(id, full_name, job_title, station, role, branches(name))")
          .eq("tenant_id", tenantId)
          .eq("work_date", date)
          .order("check_in_at", { ascending: false }),
        user ? supabase
          .from("employees")
          .select("id, full_name, job_title, station, role, is_active, branches(name)")
          .eq("tenant_id", tenantId)
          .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
          .maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (empRes.error) toast.error(empRes.error.message);
      if (attRes.error) toast.error(attRes.error.message);

      setEmployees((empRes.data ?? []) as Employee[]);
      setRecords((attRes.data ?? []) as AttendanceRecord[]);
      setCurrentEmp((myEmpRes.data ?? null) as Employee | null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || t("خطأ في تحميل البيانات"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [tenantId, date]);

  const myOpenShift = useMemo(() => records.find((r) => r.employee_id === currentEmp?.id && !r.check_out_at), [records, currentEmp]);

  function getLocation(): Promise<{ lat?: number; lng?: number }> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function checkInMyShift() {
    if (!currentEmp) return toast.error(t("حسابك غير مربوط بموظف"));
    setBusyMyShift(true);
    const loc = await getLocation();
    const { error } = await supabase.from("employee_attendance").insert({
      tenant_id: tenantId,
      employee_id: currentEmp.id,
      work_date: date,
      check_in_lat: loc.lat ?? null,
      check_in_lng: loc.lng ?? null,
      notes: t("attendance.personalNotes"),
    });
    setBusyMyShift(false);
    if (error) return toast.error(error.message);
    toast.success(t("attendance.toastInSuccess"));
    loadData();
  }

  async function checkOutMyShift() {
    if (!myOpenShift) return;
    setBusyMyShift(true);
    const loc = await getLocation();
    const { error } = await supabase.from("employee_attendance").update({
      check_out_at: new Date().toISOString(),
      check_out_lat: loc.lat ?? null,
      check_out_lng: loc.lng ?? null,
    }).eq("id", myOpenShift.id);
    setBusyMyShift(false);
    if (error) return toast.error(error.message);
    toast.success(t("attendance.toastOutSuccess"));
    loadData();
  }

  // Derive KPIs and filtered views
  const presentRecords = useMemo(() => records.filter((r) => !r.check_out_at), [records]);
  const checkedOutRecords = useMemo(() => records.filter((r) => !!r.check_out_at), [records]);
  
  const attendedEmpIds = useMemo(() => new Set(records.map((r) => r.employee_id)), [records]);
  const absentEmployees = useMemo(() => employees.filter((e) => !attendedEmpIds.has(e.id)), [employees, attendedEmpIds]);

  const totalWorkedMinutes = useMemo(() => {
    return records.reduce((sum, r) => sum + calculateDuration(r.check_in_at, r.check_out_at).totalMinutes, 0);
  }, [records]);

  const totalHoursFormatted = useMemo(() => {
    const hours = Math.floor(totalWorkedMinutes / 60);
    const mins = totalWorkedMinutes % 60;
    return `${hours} س و ${mins} د`;
  }, [totalWorkedMinutes]);

  const filteredRecords = useMemo(() => {
    let list = records;
    if (activeTab === "present") list = presentRecords;
    if (activeTab === "checked_out") list = checkedOutRecords;

    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((r) => {
      const name = r.employees?.full_name || "";
      const title = r.employees?.job_title || "";
      const station = r.employees?.station || "";
      return name.toLowerCase().includes(s) || title.toLowerCase().includes(s) || station.toLowerCase().includes(s);
    });
  }, [records, presentRecords, checkedOutRecords, activeTab, search]);

  const filteredAbsent = useMemo(() => {
    if (!search.trim()) return absentEmployees;
    const s = search.toLowerCase();
    return absentEmployees.filter((e) => {
      return (e.full_name || "").toLowerCase().includes(s) || (e.job_title || "").toLowerCase().includes(s);
    });
  }, [absentEmployees, search]);

  function openNewRecord(empId?: string) {
    setEditingId(null);
    setSelectedEmpId(empId || (employees[0]?.id ?? ""));
    setModalDate(date);
    setCheckInTime("09:00");
    setCheckOutTime("");
    setNotes(t("attendance.adminNotes"));
    setOpenModal(true);
  }

  function openEditRecord(r: AttendanceRecord) {
    setEditingId(r.id);
    setSelectedEmpId(r.employee_id);
    setModalDate(r.work_date);
    
    try {
      const inDate = new Date(r.check_in_at);
      setCheckInTime(inDate.toTimeString().slice(0, 5));
    } catch {
      setCheckInTime("09:00");
    }

    if (r.check_out_at) {
      try {
        const outDate = new Date(r.check_out_at);
        setCheckOutTime(outDate.toTimeString().slice(0, 5));
      } catch {
        setCheckOutTime("");
      }
    } else {
      setCheckOutTime("");
    }

    setNotes(r.notes || "");
    setOpenModal(true);
  }

  async function saveModalRecord() {
    if (!selectedEmpId || !modalDate || !checkInTime) {
      return toast.error(t("attendance.errorRequired"));
    }
    setSaving(true);
    try {
      const inIso = new Date(`${modalDate}T${checkInTime}:00`).toISOString();
      const outIso = checkOutTime ? new Date(`${modalDate}T${checkOutTime}:00`).toISOString() : null;

      const payload: any = {
        tenant_id: tenantId,
        employee_id: selectedEmpId,
        work_date: modalDate,
        check_in_at: inIso,
        check_out_at: outIso,
        notes: notes.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase.from("employee_attendance").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success(t("attendance.toastUpdateSuccess"));
      } else {
        const { error } = await supabase.from("employee_attendance").insert(payload);
        if (error) throw error;
        toast.success(t("attendance.toastAddSuccess"));
      }
      setOpenModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || t("فشل حفظ البيانات"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm(t("attendance.confirmDelete"))) return;
    try {
      const { error } = await supabase.from("employee_attendance").delete().eq("id", id);
      if (error) throw error;
      toast.success(t("attendance.toastDeleteSuccess"));
      loadData();
    } catch (err: any) {
      toast.error(err?.message || t("فشل الحذف"));
    }
  }

  async function quickCheckIn(empId: string) {
    try {
      const { error } = await supabase.from("employee_attendance").insert({
        tenant_id: tenantId,
        employee_id: empId,
        work_date: date,
        check_in_at: new Date().toISOString(),
        notes: t("تسجيل حضور سريع بواسطة الإدارة"),
      });
      if (error) throw error;
      toast.success(t("attendance.toastQuickInSuccess"));
      loadData();
    } catch (err: any) {
      toast.error(err?.message || t("فشل التسجيل"));
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir={dir}>
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>{t("attendance.badge", "نظام موارد للموارد البشرية والحضور والانصراف — Mawared HR")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Clock className="w-8 h-8 text-teal-600 shrink-0" />
            <span>{t("attendance.title", "لوحة الحضور والانصراف والمناوبات")}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {t("attendance.subtitle", "تتبع الحضور اللحظي، المراقبة الجغرافية (GPS Geofencing)، حساب ساعات العمل اليومية وسجلات الحضور والغياب لجميع الموظفين.")}
          </p>
        </div>

        {isManager && (
          <div className="flex gap-2 items-center">
            <Button onClick={() => openNewRecord()} className="bg-teal-600 hover:bg-teal-700 text-white font-black shadow-md rounded-2xl h-12 px-5">
              <Plus className="w-5 h-5 ms-1.5" />
              <span>{t("attendance.btnNew", "تسجيل وردية / تعديل يدوي")}</span>
            </Button>
          </div>
        )}
      </div>

      {/* My Personal Attendance Banner */}
      {currentEmp && (
        <Card className="border-2 border-teal-500/40 bg-gradient-to-br from-teal-600 to-slate-900 text-white rounded-3xl shadow-xl overflow-hidden">
          <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
                ⏱️
              </div>
              <div>
                <div className="text-xs text-teal-200 font-bold uppercase tracking-wider font-mono">سجلك الشخصي اليومي في الموارد البشرية</div>
                <h3 className="text-xl font-black mt-0.5">أهلاً بك، {currentEmp.full_name} 👋</h3>
                <p className="text-xs text-teal-100 font-medium mt-1">
                  {myOpenShift ? interpolate(t("attendance.presentSince"), { time: formatTime(myOpenShift.check_in_at) }) : t("attendance.notCheckedIn")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {myOpenShift ? (
                <Button onClick={checkOutMyShift} disabled={busyMyShift} className="bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl h-12 px-6 shadow-lg transition">
                  {busyMyShift ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-5 h-5 ms-1.5" />}
                  <span>{t("attendance.checkoutNow")} (GPS)</span>
                </Button>
              ) : (
                <Button onClick={checkInMyShift} disabled={busyMyShift} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl h-12 px-6 shadow-lg transition">
                  {busyMyShift ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-5 h-5 ms-1.5" />}
                  <span>{t("attendance.checkinNow")} (GPS)</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Filter & Search Controls */}
      <Card className="border border-slate-200 shadow-sm rounded-3xl bg-slate-50/60 overflow-hidden">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white border rounded-2xl p-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-teal-600 ms-2" />
              <Label className="text-xs font-bold text-slate-700">{t("attendance.selectDate", t("attendance.workDate") + ":")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 w-40 border-0 font-mono font-black text-slate-900 bg-transparent focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { label: t("اليوم"), val: new Date().toISOString().slice(0, 10) },
                { label: t("أمس"), val: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
              ].map((btn) => (
                <button
                  key={btn.val}
                  onClick={() => setDate(btn.val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    date === btn.val
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-white border text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("attendance.searchPlaceholder", "بحث باسم الموظف، الفرع أو الوظيفة...")}
              className="h-10 pe-9 rounded-2xl bg-white font-medium"
            />
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-gradient-to-br from-white to-slate-50 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">{t("attendance.kpiStaff", "إجمالي الموظفين النشطين")}</p>
              <p className="text-2xl md:text-3xl font-black font-mono text-slate-900">{employees.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border text-slate-700 flex items-center justify-center shrink-0">
              <BriefcaseBusiness className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-emerald-50/40 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>{t("attendance.kpiPresent", "حاضرون في العمل الآن")}</span>
              </p>
              <p className="text-2xl md:text-3xl font-black font-mono text-emerald-700">{presentRecords.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-blue-50/40 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-blue-800">{t("attendance.kpiCheckedOut", "ورديات مكتملة (منصرف)")}</p>
              <p className="text-2xl md:text-3xl font-black font-mono text-blue-700">{checkedOutRecords.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-200 shadow-xs rounded-2xl bg-gradient-to-br from-white to-amber-50/40 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-800">{t("attendance.kpiHours", "إجمالي ساعات العمل المسجلة")}</p>
              <p className="text-lg md:text-xl font-black font-mono text-amber-900">{totalHoursFormatted}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "all", label: t("سجلات الحضور"), count: records.length, color: "bg-teal-600 text-white" },
          { key: "present", label: t("حاضرون الآن"), count: presentRecords.length, color: "bg-emerald-600 text-white" },
          { key: "checked_out", label: t("منصرفون"), count: checkedOutRecords.length, color: "bg-blue-600 text-white" },
          { key: "absent", label: t("غائبون اليوم"), count: absentEmployees.length, color: "bg-amber-600 text-white" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm transition ${
              activeTab === tab.key ? tab.color + " shadow-md" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>{tab.label}</span>
            <Badge className={`ms-1 text-xs px-2 py-0.5 font-mono ${activeTab === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-800"}`}>
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto" />
          <div className="font-extrabold text-slate-700">{t("common.loading", "جاري تحميل سجلات الحضور والانصراف...")}</div>
        </div>
      ) : activeTab === "absent" ? (
        /* ABSENT STAFF TAB */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{t("attendance.absentNotice", "تنبيه: هؤلاء الموظفون لم يقوموا بتسجيل حضورهم حتى هذه اللحظة في تاريخ هذا اليوم.")}</span>
          </div>

          {filteredAbsent.length === 0 ? (
            <Card className="p-12 text-center border-dashed rounded-3xl">
              <UserCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-black text-lg text-slate-800">{t("attendance.noAbsent", "ممتاز! لا يوجد أي غياب مسجل هذا اليوم")}</h3>
              <p className="text-xs text-slate-500 mt-1">جميع الموظفين النشطين قاموا بتسجيل الحضور.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAbsent.map((emp) => (
                <Card key={emp.id} className="border border-slate-200 hover:border-amber-300 transition rounded-2xl bg-white shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-black text-base text-slate-900 truncate">{emp.full_name}</div>
                      <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <span>{emp.job_title || t("موظف")}</span>
                        {emp.branches?.name && <Badge variant="outline" className="text-[10px]">{emp.branches.name}</Badge>}
                      </div>
                    </div>

                    {isManager && (
                      <Button size="sm" onClick={() => quickCheckIn(emp.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shrink-0">
                        <LogIn className="w-3.5 h-3.5 ms-1" />
                        <span>{t("attendance.btnQuickCheckIn", "حضور الآن")}</span>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ATTENDANCE RECORDS TABLE */
        <Card className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-white">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colEmp", "الموظف والفرع")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colStatus", "الحالة")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colCheckIn", "حضور (Check-In)")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colCheckOut", "انصراف (Check-Out)")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colDuration", "مدة العمل")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colNotes", "ملاحظات / الرقابة")}</th>
                  {isManager && <th className="p-4 text-end font-black text-slate-700">{t("common.actions", "إجراءات")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={isManager ? 7 : 6} className="p-12 text-center text-slate-400 font-bold">
                      <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <div>{t("attendance.emptyRecords")}</div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const dur = calculateDuration(r.check_in_at, r.check_out_at);
                    const isOpen = !r.check_out_at;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4">
                          <div className="font-extrabold text-slate-900">{r.employees?.full_name || t("موظف محذوف")}</div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{r.employees?.job_title || r.employees?.role || t("موظف")}</span>
                            {r.employees?.branches?.name && <Badge variant="outline" className="text-[10px]">{r.employees.branches.name}</Badge>}
                          </div>
                        </td>

                        <td className="p-4">
                          {isOpen ? (
                            <Badge className="bg-emerald-600 text-white gap-1 font-bold shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              <span>{t("attendance.statusPresent")}</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-600 text-white font-bold">
                              <span>{t("attendance.statusDone")}</span>
                            </Badge>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="font-mono font-black text-slate-900">{formatTime(r.check_in_at)}</div>
                          <div className="mt-0.5">
                            {r.check_in_lat && r.check_in_lng ? (
                              <a
                                href={`https://maps.google.com/?q=${r.check_in_lat},${r.check_in_lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 font-mono"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>{r.check_in_lat.toFixed(4)}, {r.check_in_lng.toFixed(4)}</span>
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">{t("attendance.noGps")}</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-mono font-black text-slate-900">{formatTime(r.check_out_at)}</div>
                          <div className="mt-0.5">
                            {r.check_out_lat && r.check_out_lng ? (
                              <a
                                href={`https://maps.google.com/?q=${r.check_out_lat},${r.check_out_lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-700 font-bold hover:underline flex items-center gap-1 font-mono"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>{r.check_out_lat.toFixed(4)}, {r.check_out_lng.toFixed(4)}</span>
                              </a>
                            ) : isOpen ? (
                              <span className="text-[11px] text-emerald-600 font-bold italic">{t("attendance.shiftOngoing")}</span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">{t("attendance.noGps")}</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="font-mono font-black text-slate-800 bg-slate-100 border px-2.5 py-1 rounded-xl text-xs">
                            {dur.text}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="text-xs text-slate-600 max-w-xs truncate" title={r.notes || ""}>
                            {r.notes || <span className="text-slate-400 italic">{t("attendance.normalRecord")}</span>}
                          </div>
                        </td>

                        {isManager && (
                          <td className="p-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => openEditRecord(r)} className="h-8 px-2.5 font-bold">
                                <Edit className="w-3.5 h-3.5 ms-1" />
                                <span>{t("common.edit", "تعديل")}</span>
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteRecord(r.id)} className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Mawared HR Manual Register / Edit Dialog */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md rounded-3xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <span>{editingId ? t("attendance.modalEdit") : t("attendance.modalNew")}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("attendance.labelEmp")}</Label>
              <Select value={selectedEmpId} onValueChange={setSelectedEmpId} disabled={!!editingId}>
                <SelectTrigger className="rounded-xl h-11 font-bold">
                  <SelectValue placeholder=t("اختر الموظف...") />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="font-bold">
                      {e.full_name} {e.job_title ? `(${e.job_title})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("attendance.labelDate")}</Label>
              <Input
                type="date"
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                className="rounded-xl h-11 font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("attendance.labelIn")}</Label>
                <Input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  required
                  className="rounded-xl h-11 font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("attendance.labelOut")}</Label>
                <Input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="rounded-xl h-11 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("attendance.labelNotes")}</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("attendance.notesPlaceholder")}
                className="rounded-xl font-medium text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)} className="rounded-xl font-bold">
              {t("common.cancel", "common.cancel")}
            </Button>
            <Button onClick={saveModalRecord} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl px-6">
              {saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : t("common.save", "حفظ السجل")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
