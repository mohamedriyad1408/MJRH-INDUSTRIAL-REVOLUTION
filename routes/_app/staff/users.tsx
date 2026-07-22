import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@/hooks/use-server-fn";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Plus, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/staff/users")({
  head: () => ({ meta: [{ title: "Users - MJRH" }] }),
  component: StaffUsersPage,
});

type RoleRow = { user_id: string; role: string; tenant_id: string; email?: string };

function StaffUsersPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("user_roles").select("*").eq("tenant_id", tenantId);
    if (error) toast.error(error.message);
    setRows((data ?? []) as RoleRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tenantId]);

  if (!hasRole("owner")) return <Card className="p-8 text-center">{t("staff.users.ownerOnly")}</Card>;
  if (!tenantId) return <Card className="p-8 text-center">{t("staff.users.noTenant")}</Card>;

  return (
    <div className="space-y-4 max-w-4xl" dir={dir}>
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="w-6 h-6" /> {t("staff.users.pageTitle")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" /> {t("staff.users.btnNew")}</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("staff.users.titleNew")}</DialogTitle></DialogHeader>
            <AddUserForm tenantId={tenantId} onDone={() => { setOpen(false); load(); }} t={t} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((r, i) => (
            <Card key={i} className="p-4 flex items-center justify-between">
              <div><div className="font-bold">{r.email ?? `User ID: ${r.user_id.slice(0, 8)}`}</div><div className="text-xs text-muted-foreground">{r.user_id}</div></div>
              <Badge variant="outline">{r.role}</Badge>
            </Card>
          ))}
          {!rows.length && <Card className="p-8 text-center text-muted-foreground col-span-full">{t("staff.users.empty")}</Card>}
        </div>
      )}
    </div>
  );
}

function AddUserForm({ tenantId, onDone, t }: { tenantId: string; onDone: () => void; t: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("employee");
  const [station, setStation] = useState("none");
  const [jobRole, setJobRole] = useState("other");
  const [monthlySalary, setMonthlySalary] = useState("0");
  const [commissionPercent, setCommissionPercent] = useState("0");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const fn = useServerFn(adminApi.createTenantUser);

  useEffect(() => {
    supabase.from("branches").select("id, name").eq("tenant_id", tenantId).eq("is_active", true).then(({ data }: any) => setBranches(data ?? []));
  }, [tenantId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await fn({ tenantId, email, password, fullName, role, station: station === "none" ? null : station, jobRole, monthlySalary: Number(monthlySalary || 0), commissionPercent: Number(commissionPercent || 0), branchId: branchId || null }); toast.success(t("staff.users.toastCreated")); onDone(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4 py-2">
      <div><Label>{t("staff.users.labelName")}</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
      <div><Label>{t("staff.users.labelEmail")}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div><Label>{t("staff.users.labelPassword")}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
      <div>
        <Label>{t("staff.users.labelRole")}</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cs_manager">{t("staff.users.roleCs")}</SelectItem>
            <SelectItem value="ops_manager">{t("staff.users.roleOps")}</SelectItem>
            <SelectItem value="employee">{t("staff.users.roleEmp")}</SelectItem>
            <SelectItem value="courier">{t("staff.users.roleDriver")}</SelectItem>
            <SelectItem value="customer">{t("staff.users.roleCust")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {["employee", "courier", "cs_manager", "ops_manager"].includes(role) && (
        <div className="space-y-3 border-t pt-3 mt-3">
          <div className="text-sm font-bold">{t("staff.users.opsSalaryHeader")}</div>
          {branches.length > 0 && <div>
            <Label>{t("staff.users.labelBranch")}</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder={t("staff.users.branchPlaceholder")} /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
          <div>
            <Label>{t("staff.users.labelStation")}</Label>
            <Select value={station} onValueChange={setStation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("staff.users.stationNone")}</SelectItem>
                <SelectItem value="reception">{t("staff.users.stationReception")}</SelectItem>
                <SelectItem value="cleaning">{t("staff.users.stationCleaning")}</SelectItem>
                <SelectItem value="drying_assembly">{t("staff.users.stationAssembly")}</SelectItem>
                <SelectItem value="ironing">{t("staff.users.stationIroning")}</SelectItem>
                <SelectItem value="packing">{t("staff.users.stationPacking")}</SelectItem>
                <SelectItem value="delivery">{t("staff.users.stationDelivery")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("staff.users.labelJobRole")}</Label>
            <Select value={jobRole} onValueChange={setJobRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ops_manager">Ops Manager</SelectItem>
                <SelectItem value="cs_manager">CS Manager</SelectItem>
                <SelectItem value="cleaning_tech">Cleaning Tech</SelectItem>
                <SelectItem value="ironing_tech">Ironing Tech</SelectItem>
                <SelectItem value="packing_tech">Packing Tech</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>{t("staff.users.labelSalary")}</Label><Input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} /></div>
            <div><Label>{t("staff.users.labelComm")}</Label><Input type="number" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} /></div>
          </div>
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save", "حفظ")}
      </Button>
    </form>
  );
}
