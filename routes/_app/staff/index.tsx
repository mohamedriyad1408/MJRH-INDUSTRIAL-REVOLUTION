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

export const Route = createFileRoute("/_app/staff/")({
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
};

const ROLE_AR: Record<string, string> = {
  owner: "مالك",
  cs_manager: "مدير خدمة عملاء",
  ops_manager: "مدير تشغيل",
  courier: "مندوب",
};

function StaffListPage() {
  const { hasRole } = useAuth();
  const isOwner = hasRole("owner");
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("active");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Employee[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">الموظفين</h1>
          <p className="text-sm text-muted-foreground">إدارة الفريق والأدوار والوظائف</p>
        </div>
        {isOwner && (
          <Button asChild>
            <Link to="/staff/new"><Plus className="w-4 h-4 ms-1" /> موظف جديد</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ابحث بالاسم أو الوظيفة..." value={search} onChange={(e) => setSearch(e.target.value)} className="pe-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأدوار</SelectItem>
            <SelectItem value="owner">مالك</SelectItem>
            <SelectItem value="cs_manager">مدير خدمة عملاء</SelectItem>
            <SelectItem value="ops_manager">مدير تشغيل</SelectItem>
            <SelectItem value="courier">مندوب</SelectItem>
            <SelectItem value="none">بدون دور نظام</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">نشطين</SelectItem>
            <SelectItem value="inactive">غير نشطين</SelectItem>
            <SelectItem value="all">الكل</SelectItem>
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
                  <th className="text-start p-3">الاسم</th>
                  <th className="text-start p-3">الوظيفة</th>
                  <th className="text-start p-3">الدور</th>
                  <th className="text-start p-3">المحطة</th>
                  <th className="text-start p-3">تاريخ التعيين</th>
                  <th className="text-start p-3">الحالة</th>
                  <th className="p-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد نتائج</td></tr>
                )}
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{e.full_name}</td>
                    <td className="p-3">{e.job_title}</td>
                    <td className="p-3">{e.role ? <Badge variant="secondary">{ROLE_AR[e.role]}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</td>
                    <td className="p-3 text-muted-foreground text-xs">{e.station ? stationAr(e.station) : "—"}</td>
                    <td className="p-3 text-xs">{fmtDate(e.hire_date)}</td>
                    <td className="p-3">{e.is_active ? <Badge className="bg-emerald-600">نشط</Badge> : <Badge variant="outline">موقوف</Badge>}</td>
                    <td className="p-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/staff/$id" params={{ id: e.id }}><UserCog className="w-4 h-4" /></Link>
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

function stationAr(s: string) {
  const map: Record<string, string> = { reception: "الاستلام", cleaning: "التنظيف", ironing: "الكي", packing: "التغليف", delivery: "التسليم" };
  return map[s] ?? "—";
}
