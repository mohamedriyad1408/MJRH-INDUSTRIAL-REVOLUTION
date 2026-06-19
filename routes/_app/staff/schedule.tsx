import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/_app/staff/schedule")({
  component: SchedulePage,
});

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

type Employee = { id: string; full_name: string; job_title: string; is_active: boolean };
type Schedule = {
  id?: string;
  employee_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_off: boolean;
};

function SchedulePage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "cs_manager", "ops_manager");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: emps }, { data: scheds }] = await Promise.all([
      supabase.from("employees").select("id, full_name, job_title, is_active").eq("is_active", true).order("full_name"),
      supabase.from("work_schedules").select("*"),
    ]);
    setEmployees((emps ?? []) as Employee[]);
    const map: Record<string, Schedule> = {};
    (scheds ?? []).forEach((s: any) => {
      map[`${s.employee_id}_${s.day_of_week}`] = s;
    });
    setSchedules(map);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function cellKey(eid: string, day: number) { return `${eid}_${day}`; }

  function update(eid: string, day: number, patch: Partial<Schedule>) {
    const key = cellKey(eid, day);
    const cur = schedules[key] ?? { employee_id: eid, day_of_week: day, start_time: "09:00", end_time: "17:00", is_off: false };
    setSchedules({ ...schedules, [key]: { ...cur, ...patch } });
  }

  async function saveAll() {
    setSaving(true);
    const rows = Object.values(schedules).map((s) => ({
      ...(s.id ? { id: s.id } : {}),
      employee_id: s.employee_id,
      day_of_week: s.day_of_week,
      start_time: s.is_off ? null : s.start_time,
      end_time: s.is_off ? null : s.end_time,
      is_off: s.is_off,
    }));
    const { error } = await supabase.from("work_schedules").upsert(rows, { onConflict: "id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ الجدول");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">جدول العمل الأسبوعي</h1>
          <p className="text-sm text-muted-foreground">حدد ساعات وأيام العمل لكل موظف</p>
        </div>
        {canEdit && (
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ms-1" /> حفظ</>}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : employees.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">لا يوجد موظفون نشطون</Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-2 sticky right-0 bg-muted/50 z-10 min-w-[160px]">الموظف</th>
                  {DAYS.map((d) => <th key={d} className="p-2 text-center min-w-[110px]">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2 sticky right-0 bg-card font-medium z-10">
                      <div>{e.full_name}</div>
                      <div className="text-[10px] text-muted-foreground">{e.job_title}</div>
                    </td>
                    {DAYS.map((_, day) => {
                      const s = schedules[cellKey(e.id, day)];
                      const off = s?.is_off ?? false;
                      return (
                        <td key={day} className="p-1 border-s">
                          <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-1 text-[10px]">
                              <input
                                type="checkbox"
                                checked={off}
                                disabled={!canEdit}
                                onChange={(ev) => update(e.id, day, { is_off: ev.target.checked })}
                              />
                              عطلة
                            </label>
                            {!off && (
                              <>
                                <Input
                                  type="time"
                                  value={s?.start_time ?? "09:00"}
                                  disabled={!canEdit}
                                  onChange={(ev) => update(e.id, day, { start_time: ev.target.value })}
                                  className="h-7 text-[11px] px-1"
                                />
                                <Input
                                  type="time"
                                  value={s?.end_time ?? "17:00"}
                                  disabled={!canEdit}
                                  onChange={(ev) => update(e.id, day, { end_time: ev.target.value })}
                                  className="h-7 text-[11px] px-1"
                                />
                              </>
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
