import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, UserCog } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/staff/")({
  component: StaffListPage,
});

type Employee = {
  id: string;
  full_name: string;
  job_title: string;
  role: "owner" | "cs_manager" | "ops_manager" | "courier" | null;
  station: "reception" | "cleaning" | "ironing" | "packing" | "delivery" | null;
  phone: string | null;
  email: string | null;
  monthly_salary: number;
  commission_percent: number;
  hire_date: string;
  is_active: boolean;
  branch_id?: string | null;
  branches?: { name: string } | null;
};

const ROLE_AR: Record<string, string> = {};

function StaffListPage() {
  const { hasRole, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const isOwner = hasRole("owner");
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");

  useEffect(() => {
    if (tenantId) {
      supabase
        .from("branches")
        .select("id,name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at")
        .then(({ data }: any) => setBranches(data ?? []));
    }
  }, [tenantId]);

  async function load() {
    setLoading(true);
    let query = supabase.from("employees").select("*,branches(name)");
    if (branchId !== "all") {
      query = query.eq("branch_id", branchId);
    }
    const { data } = await query.order("created_at", { ascending: false });
    setList((data ?? []) as any[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [branchId]);

  const filtered = list.filter((e) => {
    if (filterStatus === "active" && !e.is_active) return false;
    if (filterStatus === "inactive" && e.is_active) return false;
    if (filterRole !== "all") {
      if (filterRole === "none" && e.role) return false;
      if (filterRole !== "none" && e.role !== filterRole) return false;
    }
    if (search && !e.full_name.includes(search) && !e.job_title.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("nav./staff")}</h1>
          <p className="text-sm text-muted-foreground">{t("staff.subtitle")}</p>
        </div>
        {isOwner && (
          <Button asChild>
            <Link to={"/$tenant/staff/new" as any}><Plus className="w-4 h-4 ms-1" /> {t("nav./staff/new")}</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px]">
          <Search className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("staff.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pe-9" />
        </div>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-44"><SelectValue placeholder={t("common.branch")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allBranches")}</SelectItem>
            {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("staff.allRoles")}</SelectItem>
            <SelectItem value="owner">{t("role.owner")}</SelectItem>
            <SelectItem value="cs_manager">{t("role.cs_manager")}</SelectItem>
            <SelectItem value="ops_manager">{t("role.ops_manager")}</SelectItem>
            <SelectItem value="courier">{t("role.courier")}</SelectItem>
            <SelectItem value="none">{t("staff.noSystemRole")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t("staff.active")}</SelectItem>
            <SelectItem value="inactive">{t("staff.inactive")}</SelectItem>
            <SelectItem value="all">{t("notif.filter.all")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3">{t("login.fullName")}</th>
                  <th className="text-start p-3">{t("common.branch")}</th>
                  <th className="text-start p-3">{t("common.role")}</th>
                  <th className="text-start p-3">{t("common.role")}</th>
                  <th className="text-start p-3">{t("stage.received")}</th>
                  <th className="text-start p-3">{t("staff.hireDate")}</th>
                  <th className="text-start p-3">{t("common.status")}</th>
                  <th className="p-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t("common.noRows")}</td></tr>
                )}
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{e.full_name}</td>
                    <td className="p-3 text-xs font-bold text-teal-600">{e.branches?.name ?? "—"}</td>
                    <td className="p-3">{e.job_title}</td>
                    <td className="p-3">{e.role ? <Badge variant="secondary">{t("role." + e.role)}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</td>
                    <td className="p-3 text-muted-foreground text-xs">{e.station ? t("stage." + e.station) : "—"}</td>
                    <td className="p-3 text-xs">{fmtDate(e.hire_date)}</td>
                    <td className="p-3">{e.is_active ? <Badge className="bg-emerald-600">{t("staff.active")}</Badge> : <Badge variant="outline">{t("staff.inactive")}</Badge>}</td>
                    <td className="p-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link to={"/$tenant/staff/$id" as any} params={{ id: e.id } as any}><UserCog className="w-4 h-4" /></Link>
                      </Button>
                    </td>
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
