import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { UserCheck, RefreshCw, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ActiveActor = {
  id: string;
  full_name: string;
  job_title: string | null;
  station: string | null;
  role: string | null;
  assigned_stations?: string[];
};

type Props = {
  stationId: string; // "reception", "cleaning", "drying-assembly", "ironing", "packing", "qc"
  stationLabel: string;
  onActorChange?: (actor: ActiveActor | null) => void;
};

export function StationActorWidget({ stationId, stationLabel, onActorChange }: Props) {
  const { tenantId } = useAuth();
  const [staffList, setStaffList] = useState<ActiveActor[]>([]);
  const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);
  const [openSelector, setOpenSelector] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("employees")
      .select("id, full_name, job_title, station, role, assigned_stations")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }: any) => {
        const list = ((data ?? []) as ActiveActor[]).filter((e) => {
          // Owners shouldn't be rotational operators unless needed, filter out owner from normal operational actors unless they are supervisor/ops
          if (e.role === "owner" || e.job_title?.includes("مالك") || e.full_name?.includes("مالك")) return false;
          // Check if employee has station role or supervisory ability
          if (["ops_manager", "cs_manager", "supervisor"].includes(String(e.role))) return true;
          if (e.station === stationId) return true;
          if (Array.isArray(e.assigned_stations) && e.assigned_stations.includes(stationId)) return true;
          return false;
        });
        setStaffList(list);

        // Try to load saved actor from localStorage
        const savedId = localStorage.getItem(`mjrh_actor_${stationId}_${tenantId}`);
        const found = list.find((x) => x.id === savedId) || list[0] || null;
        setActiveActor(found);
        if (onActorChange) onActorChange(found);
      });
  }, [tenantId, stationId]);

  function selectActor(emp: ActiveActor) {
    setActiveActor(emp);
    if (tenantId) localStorage.setItem(`mjrh_actor_${stationId}_${tenantId}`, emp.id);
    if (onActorChange) onActorChange(emp);
    setOpenSelector(false);
  }

  return (
    <>
      <div className="rounded-2xl border-2 border-teal-500/40 bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400 text-teal-300 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-teal-200 uppercase font-mono font-bold tracking-wider flex items-center gap-1.5">
              <span>👤 الموظف الفاعل حالياً (Actor attribution)</span>
              <Badge variant="outline" className="text-[9px] bg-white/10 text-white border-white/20">{stationLabel}</Badge>
            </div>
            <div className="text-sm font-black text-white truncate mt-0.5">
              {activeActor ? `${activeActor.full_name} (${activeActor.job_title || "فني/موظف"})` : "لم يتم تحديد الموظف بعد — يرجى اختيار اسمك"}
            </div>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setOpenSelector(true)}
          className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black rounded-xl text-xs h-9 px-3.5 shadow-sm shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 ms-1" />
          <span>🔄 تبديل الموظف (Shift Rotation)</span>
        </Button>
      </div>

      <Dialog open={openSelector} onOpenChange={setOpenSelector}>
        <DialogContent className="max-w-md rounded-3xl p-6 space-y-4" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-slate-900">
              <Users className="w-5 h-5 text-teal-600" />
              <span>اختر اسمك لتسجيل بدء المهام الفنية (Actor Attribution):</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            وفقاً لإجراءات التشغيل، سيتم ربط كافة التعديلات، الفواتير، الاستلامات، وإصدارات الجودة باسم الموظف المختار لحساب مؤشرات الأداء (Scorecard) الخاصة به تلقائياً.
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {staffList.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border">
                لا يوجد موظفون مربوطون بهذه المحطة حالياً. يمكن لمدير النظام إضافة الصلاحية للموظفين من قائمة فريق العمل.
              </div>
            ) : (
              staffList.map((emp) => {
                const isSelected = activeActor?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => selectActor(emp)}
                    className={`w-full p-3 rounded-2xl border-2 text-start transition flex items-center justify-between ${
                      isSelected ? "border-teal-600 bg-teal-50 text-teal-950 font-black shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold"
                    }`}
                  >
                    <div>
                      <div className="text-sm">{emp.full_name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{emp.job_title || "موظف محطة"}</div>
                    </div>
                    {isSelected && <Badge className="bg-teal-600 text-white font-black text-[10px]">محدد حالياً ✓</Badge>}
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSelector(false)} className="w-full rounded-xl font-bold">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
