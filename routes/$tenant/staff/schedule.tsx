import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/staff/schedule")({
  component: SchedulePage,
});

type Employee = any;
type S = { id?: string; day_of_week: number; start_time: string | null; end_time: string | null; is_off: boolean };

function SchedulePage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const isOwner = hasRole("owner");
  const canEdit = isOwner || hasRole("ops_manager") || hasRole("cs_manager");
  const [loading, setLoading] = useState(true);
  const [emps, setEmps] = useState<Employee[]>([]);
  const [sched, setSched] = useState<Record<string, S[]>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [eRes, sRes] = await Promise.all([
      supabase.from("employees").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("full_name"),
      supabase.from("employee_schedule").select("*").eq("tenant_id", tenantId),
    ]);
    const empList = eRes.data ?? [];
    const scList = sRes.data ?? [];
    setEmps(empList);

    const m: Record<string, S[]> = {};
    empList.forEach((e: any) => {
      const days: S[] = [];
      for (let d = 0; d < 7; d++) {
        const row = scList.find((x: any) => x.employee_id === e.id && x.day_of_week === d);
        days.push(row ? { id: row.id, day_of_week: d, start_time: row.start_time, end_time: row.end_time, is_off: row.is_off } : { day_of_week: d, start_time: "09:00", end_time: "17:00", is_off: d === 5 });
      }
      m[e.id] = days;
    });
    setSched(m);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tenantId]);

  async function save() {
    if (!tenantId) return;
    setSaving(true);
    const inserts: any[] = [];
    Object.entries(sched).forEach(([empId, days]) => {
      days.forEach((d) => { inserts.push({ id: d.id || undefined, tenant_id: tenantId, employee_id: empId, day_of_week: d.day_of_week, start_time: d.is_off ? null : d.start_time, end_time: d.is_off ? null : d.end_time, is_off: d.is_off }); });
    });
    const { error } = await supabase.from("employee_schedule").upsert(inserts);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success(t("schedule.toastSaved", "تم حفظ الجدول"));
  }

  const DAYS = [
    t("schedule.day0", "الأحد"), t("schedule.day1", "الإثنين"), t("schedule.day2", "الثلاثاء"),
    t("schedule.day3", "الأربعاء"), t("schedule.day4", "الخميس"), t("schedule.day5", "الجمعة"), t("schedule.day6", "السبت"),
  ];

  return (
    <div className="space-y-4 max-w-6xl" dir={dir}>
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("schedule.title", "جدول العمل الأسبوعي")}</h1>
          <p className="text-sm text-muted-foreground">{t("schedule.subtitle", "حدد ساعات وأيام العمل لكل موظف")}</p>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ms-1" /> {t("schedule.save", "حفظ")}</>}
          </Button>
        )}
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : emps.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t("schedule.empty", "لا يوجد موظفون نشطون")}</Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-2 sticky right-0 bg-muted/50 z-10 min-w-[160px]">{t("schedule.colStaff", "الموظف")}</th>
                  {DAYS.map((d, i) => <th key={i} className="text-center p-2 min-w-[140px] border-s">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {emps.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 font-bold sticky right-0 bg-card z-10">{e.full_name}</td>
                    {DAYS.map((_, d) => {
                      const cur = sched[e.id]?.[d] || { day_of_week: d, start_time: "09:00", end_time: "17:00", is_off: d === 5 };
                      return (
                        <td key={d} className="p-2 border-s text-center bg-card">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1 text-xs">
                              <Switch disabled={!canEdit} checked={!cur.is_off} onCheckedChange={(v) => {
                                const next = [...sched[e.id]]; next[d] = { ...cur, is_off: !v }; setSched({ ...sched, [e.id]: next });
                              }} />
                              <span className="text-[10px] text-muted-foreground">{cur.is_off ? t("schedule.offDay", "عطلة") : t("common.active")}</span>
                            </div>
                            {!cur.is_off && (
                              <div className="flex gap-1 items-center justify-center">
                                <Input disabled={!canEdit} type="time" value={cur.start_time || "09:00"} onChange={(ev) => {
                                  const next = [...sched[e.id]]; next[d] = { ...cur, start_time: ev.target.value }; setSched({ ...sched, [e.id]: next });
                                }} className="h-7 w-22 text-xs p-1 text-center" />
                                <span className="text-muted-foreground text-[10px]">-</span>
                                <Input disabled={!canEdit} type="time" value={cur.end_time || "17:00"} onChange={(ev) => {
                                  const next = [...sched[e.id]]; next[d] = { ...cur, end_time: ev.target.value }; setSched({ ...sched, [e.id]: next });
                                }} className="h-7 w-22 text-xs p-1 text-center" />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
