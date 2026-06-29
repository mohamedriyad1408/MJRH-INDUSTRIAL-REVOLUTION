import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Check, X, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/staff/leaves")({
  component: LeavesPage,
});

function LeavesPage() {
  const { t, dir } = useI18n();
  const { hasRole, user } = useAuth();
  const isOwner = hasRole("owner");
  const canDecide = isOwner || hasRole("ops_manager") || hasRole("cs_manager");

  const [leaves, setLeaves] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending"|"all">("pending");

  async function load() {
    setLoading(true);
    const [{ data: lv }, { data: h }, { data: emp }] = await Promise.all([
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("holidays").select("*").order("holiday_date", { ascending: true }),
      supabase.from("employees").select("id, full_name").eq("is_active", true).order("full_name"),
    ]);
    setLeaves(lv ?? []);
    setHolidays(h ?? []);
    setEmployees(emp ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const empMap = new Map(employees.map((e) => [e.id, e.full_name]));
  const visibleLeaves = filter === "pending" ? leaves.filter((l) => l.status === "pending") : leaves;
  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  async function decide(id: string, status: "approved"|"rejected") {
    const { error } = await supabase.from("leave_requests")
      .update({ status, decided_by: user?.id, decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض"); load(); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">الإجازات والعطلات</h1>
        <p className="text-sm text-muted-foreground">إدارة طلبات الإجازة والعطلات الرسمية</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">
            طلبات الإجازة
            {pendingCount > 0 && <Badge variant="destructive" className="me-2">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="holidays">العطلات الرسمية ({holidays.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3">
          <div className="flex justify-between items-center">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">قيد المراجعة فقط</SelectItem>
                <SelectItem value="all">كل الطلبات</SelectItem>
              </SelectContent>
            </Select>
            <NewLeaveDialog employees={employees} userId={user?.id} onCreated={load} />
          </div>

          {loading ? <Spinner /> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-start p-3">الموظف</th>
                      <th className="text-start p-3">النوع</th>
                      <th className="text-start p-3">من</th>
                      <th className="text-start p-3">إلى</th>
                      <th className="text-start p-3">السبب</th>
                      <th className="text-start p-3">الحالة</th>
                      {canDecide && <th className="p-3">إجراء</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLeaves.length === 0 && (
                      <tr><td colSpan={canDecide ? 7 : 6} className="p-6 text-center text-muted-foreground">لا توجد طلبات</td></tr>
                    )}
                    {visibleLeaves.map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="p-3 font-medium">{empMap.get(l.employee_id) ?? "—"}</td>
                        <td className="p-3">{leaveTypeAr(l.leave_type, t)}</td>
                        <td className="p-3 text-xs">{fmtDate(l.start_date)}</td>
                        <td className="p-3 text-xs">{fmtDate(l.end_date)}</td>
                        <td className="p-3 text-muted-foreground">{l.reason || "—"}</td>
                        <td className="p-3"><LeaveStatusBadge s={l.status} /></td>
                        {canDecide && (
                          <td className="p-3">
                            {l.status === "pending" ? (
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => decide(l.id, "approved")}><Check className="w-4 h-4" /></Button>
                                <Button size="sm" variant="outline" onClick={() => decide(l.id, "rejected")}><X className="w-4 h-4" /></Button>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">{fmtDate(l.decided_at)}</span>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="holidays" className="space-y-3">
          <div className="flex justify-end">
            {isOwner && <NewHolidayDialog onCreated={load} />}
          </div>
          {loading ? <Spinner /> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-start p-3">التاريخ</th>
                      <th className="text-start p-3">المناسبة</th>
                      <th className="text-start p-3">مدفوعة</th>
                      {isOwner && <th className="p-3 w-12"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.length === 0 && (
                      <tr><td colSpan={isOwner ? 4 : 3} className="p-6 text-center text-muted-foreground">لا توجد عطلات</td></tr>
                    )}
                    {holidays.map((h) => (
                      <tr key={h.id} className="border-t">
                        <td className="p-3 font-medium">{fmtDate(h.holiday_date)}</td>
                        <td className="p-3">{h.name}</td>
                        <td className="p-3">{h.is_paid ? <Badge className="bg-emerald-600">مدفوعة</Badge> : <Badge variant="outline">بدون أجر</Badge>}</td>
                        {isOwner && (
                          <td className="p-3">
                            <Button size="icon" variant="ghost" onClick={async () => {
                              if (!confirm("حذف العطلة؟")) return;
                              const { error } = await supabase.from("holidays").delete().eq("id", h.id);
                              if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
                            }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Spinner() { return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>; }
function leaveTypeAr(t: string, fn: any) {
  return { annual: fn("leave.annual", "سنوية"), sick: fn("leave.sick", "مرضية"), unpaid: fn("leave.unpaid", "بدون أجر"), emergency: fn("leave.emergency", "طارئة") }[t] ?? t;
}
function LeaveStatusBadge({ s }: { s: string }) {
  if (s === "pending") return <Badge variant="secondary">قيد المراجعة</Badge>;
  if (s === "approved") return <Badge className="bg-emerald-600">موافق</Badge>;
  return <Badge variant="destructive">مرفوض</Badge>;
}

function NewLeaveDialog({ employees, userId, onCreated }: { employees: any[]; userId?: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!employeeId) { toast.error("اختر الموظف"); return; }
    if (endDate < startDate) { toast.error("تاريخ النهاية قبل البداية"); return; }
    setSaving(true);
    const { error } = await supabase.from("leave_requests").insert({
      employee_id: employeeId, leave_type: leaveType as any,
      start_date: startDate, end_date: endDate,
      reason: reason || null, requested_by: userId,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("تم إرسال الطلب"); setOpen(false); setEmployeeId(""); setReason(""); onCreated(); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" /> طلب إجازة</Button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>طلب إجازة جديد</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>الموظف</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>النوع</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">سنوية</SelectItem>
                <SelectItem value="sick">مرضية</SelectItem>
                <SelectItem value="unpaid">بدون أجر</SelectItem>
                <SelectItem value="emergency">طارئة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>من</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>إلى</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div><Label>السبب (اختياري)</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewHolidayDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) { toast.error("أدخل اسم المناسبة"); return; }
    setSaving(true);
    const { error } = await supabase.from("holidays").insert({ holiday_date: date, name: name.trim(), is_paid: isPaid });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("تمت الإضافة"); setOpen(false); setName(""); onCreated(); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" /> عطلة جديدة</Button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إضافة عطلة رسمية</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>التاريخ</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>المناسبة</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: عيد الفطر" /></div>
          <div className="flex items-center gap-2"><Switch checked={isPaid} onCheckedChange={setIsPaid} /><span className="text-sm">عطلة مدفوعة الأجر</span></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
