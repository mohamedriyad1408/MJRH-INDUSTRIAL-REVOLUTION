import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, interpolate } from "@/lib/i18n";
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
  head: () => ({ meta: [{ title: "Attendance - MJRH" }] }),
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
    return { hours, mins, text: `${hours} h ${mins} m`, totalMinutes: diffMinutes };
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
      toast.error(t("attendance.errorFetch"));
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
    if (!currentEmp) return toast.error(t("attendance.errorNoEmpLink"));
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

  const presentRecords = useMemo(() => records.filter((r) => !r.check_out_at), [records]);
  const checkedOutRecords = useMemo(() => records.filter((r) => !!r.check_out_at), [records]);
  const attendedEmpIds = useMemo(() => new Set(records.map((r) => r.employee_id)), [records]);
  const absentEmployees = useMemo(() => employees.filter((e) => !attendedEmpIds.has(e.id)), [employees, attendedEmpIds]);

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
      toast.error(err.message || t("attendance.errorSave"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm(t("attendance.confirmDelete"))) return;
    const { error } = await supabase.from("employee_attendance").delete().eq("id", id);
    if (error) toast.error(t("attendance.errorDelete"));
    else {
      toast.success(t("attendance.toastDeleteSuccess"));
      loadData();
    }
  }

  async function quickCheckIn(empId: string) {
    const { error } = await supabase.from("employee_attendance").insert({
      tenant_id: tenantId,
      employee_id: empId,
      work_date: date,
      notes: t("attendance.quickInNotes"),
    });
    if (error) toast.error(t("attendance.errorQuickIn"));
    else {
      toast.success(t("attendance.toastQuickInSuccess"));
      loadData();
    }
  }

  return (
    <div className="space-y-6" dir={dir}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t("attendance.badge")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">{t("attendance.title")}</h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl">{t("attendance.subtitle")}</p>
        </div>

        {isManager && (
          <Button onClick={() => { setEditingId(null); setOpenModal(true); }} className="bg-teal-600 hover:bg-teal-700 font-bold rounded-xl h-11 shadow-sm">
            <Plus className="w-4 h-4 ms-2" />
            <span>{t("attendance.btnNew")}</span>
          </Button>
        )}
      </header>

      {currentEmp && (
        <Card className="border-2 border-teal-500/20 shadow-md rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-teal-600 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-teal-100 text-xs font-bold uppercase tracking-wider">{t("attendance.myAttendanceTitle")}</div>
                <h3 className="text-xl font-black">{interpolate(t("attendance.welcome"), { name: currentEmp.full_name })} 👋</h3>
                <p className="text-sm text-teal-50 font-medium">
                  {myOpenShift ? interpolate(t("attendance.presentSince"), { time: formatTime(myOpenShift.check_in_at) }) : t("attendance.notCheckedIn")}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {myOpenShift ? (
                  <Button onClick={checkOutMyShift} disabled={busyMyShift} variant="secondary" className="bg-white text-teal-700 hover:bg-teal-50 font-black rounded-2xl h-12 px-6">
                    {busyMyShift ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <LogOut className="w-4 h-4 ms-2" />}
                    <span>{t("attendance.checkoutNow")} (GPS)</span>
                  </Button>
                ) : (
                  <Button onClick={checkInMyShift} disabled={busyMyShift} className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl h-12 px-6">
                    {busyMyShift ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <LogIn className="w-4 h-4 ms-2" />}
                    <span>{t("attendance.checkinNow")} (GPS)</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-2xl shadow-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <Label className="text-xs font-bold text-slate-700">{t("attendance.workDate")}:</Label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm font-bold border-0 bg-transparent focus:ring-0 p-0 w-32" />
        </div>

        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("attendance.searchPlaceholder")} className="rounded-2xl border-slate-200 h-10 pr-9 bg-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-3xl shadow-xs border-slate-200 bg-white">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-slate-500">{t("attendance.kpiStaff")}</p>
            <div className="text-2xl font-black text-slate-900 mt-1">{employees.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-xs border-emerald-100 bg-emerald-50/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-emerald-700">
              <UserCheck className="w-4 h-4" />
              <span className="text-xs font-bold">{t("attendance.kpiPresent")}</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{presentRecords.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-xs border-blue-100 bg-blue-50/30">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-blue-800">{t("attendance.kpiCheckedOut")}</p>
            <div className="text-2xl font-black text-blue-800 mt-1">{checkedOutRecords.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-xs border-amber-100 bg-amber-50/30">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-amber-800">{t("attendance.kpiHours")}</p>
            <div className="text-2xl font-black text-amber-800 mt-1">{totalHoursFormatted}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-50 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              {t("attendance.records")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colEmp")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colStatus")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colCheckIn")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colCheckOut")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colDuration")}</th>
                  <th className="p-4 text-start font-black text-slate-700">{t("attendance.colNotes")}</th>
                  {isManager && <th className="p-4 text-end font-black text-slate-700">{t("common.actions")}</th>}
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
                          <div className="font-extrabold text-slate-900">{r.employees?.full_name || t("staff.errNotFound")}</div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{r.employees?.job_title || r.employees?.role || t("common.employee")}</span>
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
                        <td className="p-4 font-mono font-black text-slate-900">{formatTime(r.check_in_at)}</td>
                        <td className="p-4 font-mono font-black text-slate-900">
                          {isOpen ? <span className="text-emerald-600 italic">{t("attendance.shiftOngoing")}</span> : formatTime(r.check_out_at)}
                        </td>
                        <td className="p-4">
                          <span className="font-mono font-black text-slate-800 bg-slate-100 border px-2.5 py-1 rounded-xl text-xs">
                            {dur.text}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-600 truncate">{r.notes || t("attendance.normalRecord")}</td>
                        {isManager && (
                          <td className="p-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => openEditRecord(r)} className="h-8 px-2.5 font-bold">
                                <Edit className="w-3.5 h-3.5 ms-1" />
                                <span>{t("common.edit")}</span>
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteRecord(r.id)} className="h-8 px-2 text-red-600">
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
          </div>
        </CardContent>
      </Card>

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
                  <SelectValue placeholder={t("attendance.selectEmployee")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="font-bold">{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("attendance.labelDate")}</Label>
              <Input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} className="rounded-xl h-11 font-mono font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("attendance.labelIn")}</Label>
                <Input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="rounded-xl h-11 font-mono font-bold" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("attendance.labelOut")}</Label>
                <Input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="rounded-xl h-11 font-mono font-bold" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">{t("attendance.labelNotes")}</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("attendance.notesPlaceholder")} className="rounded-xl font-medium text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveModalRecord} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
