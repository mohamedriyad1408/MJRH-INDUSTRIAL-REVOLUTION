import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, LogIn, LogOut } from "lucide-react";

type Emp = { id: string; full_name: string; profile_id?: string | null; email?: string | null };

type OpenShift = { id: string; check_in_at: string } | null;

export function AttendanceWidget() {
  const { user, hasRole } = useAuth();
  const [emp, setEmp] = useState<Emp | null>(null);
  const [shift, setShift] = useState<OpenShift>(null);
  const [busy, setBusy] = useState(false);

  // الحضور للموظفين والمديرين التشغيليين فقط. المالك ليس مطلوبًا منه حضور/انصراف.
  const shouldShow = !hasRole("owner", "super_admin") && hasRole("employee", "courier", "cs_manager", "ops_manager");

  async function load() {
    if (!user || !shouldShow) return;
    const { data } = await supabase
      .from("employees")
      .select("id,full_name,profile_id,email")
      .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();
    if (data?.id && !data.profile_id) {
      await supabase.from("employees").update({ profile_id: user.id }).eq("id", data.id);
    }
    setEmp(data ?? null);
    if (!data?.id) return;
    const { data: open } = await supabase
      .from("employee_attendance")
      .select("id,check_in_at")
      .eq("employee_id", data.id)
      .is("check_out_at", null)
      .maybeSingle();
    setShift(open ?? null);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id, shouldShow]);

  function getLocation(): Promise<{ lat?: number; lng?: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function checkIn() {
    if (!emp) return toast.error("حسابك غير مربوط بموظف");
    setBusy(true);
    const loc = await getLocation();
    const { error } = await supabase.from("employee_attendance").insert({
      employee_id: emp.id,
      check_in_lat: loc.lat ?? null,
      check_in_lng: loc.lng ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل الحضور");
    load();
  }

  async function checkOut() {
    if (!shift) return;
    setBusy(true);
    const loc = await getLocation();
    const { error } = await supabase.from("employee_attendance").update({
      check_out_at: new Date().toISOString(),
      check_out_lat: loc.lat ?? null,
      check_out_lng: loc.lng ?? null,
    }).eq("id", shift.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل الانصراف");
    load();
  }

  if (!shouldShow || !emp) return null;

  return (
    <div className="ms-auto flex items-center gap-2">
      {shift ? (
        <>
          <Badge className="bg-emerald-600 gap-1"><Clock className="w-3 h-3" /> حاضر</Badge>
          <Button size="sm" variant="outline" onClick={checkOut} disabled={busy} className="h-8">
            <LogOut className="w-3 h-3 ms-1" /> انصراف
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={checkIn} disabled={busy} className="h-8 bg-teal-600 hover:bg-teal-700">
          <LogIn className="w-3 h-3 ms-1" /> حضور
        </Button>
      )}
    </div>
  );
}
