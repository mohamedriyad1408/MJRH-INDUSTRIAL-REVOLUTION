import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Station = "reception" | "cleaning" | "ironing" | "packing" | "delivery";

export function AssignEmployeeDialog({
  open, onOpenChange, orderId, station, onAssigned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  station: Station;
  onAssigned?: () => void;
}) {
  const { user } = useAuth();
  const [emps, setEmps] = useState<{ id: string; full_name: string; job_role: string }[]>([]);
  const [empId, setEmpId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Prefer employees explicitly assigned to this station; fall back to all active employees
    (async () => {
      const byStation = await supabase.from("employees").select("id, full_name, job_role")
        .eq("is_active", true).eq("station", station).order("full_name");
      if ((byStation.data ?? []).length) { setEmps(byStation.data as any); return; }
      const all = await supabase.from("employees").select("id, full_name, job_role")
        .eq("is_active", true).order("full_name");
      setEmps((all.data ?? []) as any);
    })();
  }, [open, station]);

  async function submit() {
    if (!empId) { toast.error("اختر موظف"); return; }
    setSaving(true);
    const { error } = await supabase.from("task_assignments").insert({
      order_id: orderId, station, employee_id: empId, assigned_by: user?.id, notes: notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم التعيين");
    onOpenChange(false);
    setEmpId(""); setNotes("");
    onAssigned?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تعيين المسؤول</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>الموظف</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger><SelectValue placeholder={emps.length ? "اختر..." : "لا يوجد موظفون بهذا الدور"} /></SelectTrigger>
              <SelectContent>
                {emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>ملاحظات</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin ms-1" />}تعيين</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
