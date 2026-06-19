import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Check, X, Wallet, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_app/staff/requests")({
  component: RequestsPage,
});

type Advance = {
  id: string; technician_name: string; amount: number; reason: string | null;
  status: "pending" | "approved" | "rejected"; created_at: string; decision_notes: string | null;
};
type Leave = {
  id: string; employee_id: string; leave_type: string; start_date: string; end_date: string;
  reason: string | null; status: "pending" | "approved" | "rejected"; created_at: string;
};

const LEAVE_AR: Record<string, string> = {
  annual: "اعتيادية", sick: "مرضية", unpaid: "بدون أجر", emergency: "طارئة",
};

function RequestsPage() {
  const { hasRole, user } = useAuth();
  const canDecide = hasRole("owner", "cs_manager", "ops_manager");
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: a }, { data: l }, { data: emps }] = await Promise.all([
      supabase.from("advance_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name"),
    ]);
    setAdvances((a ?? []) as Advance[]);
    setLeaves((l ?? []) as Leave[]);
    const m: Record<string, string> = {};
    (emps ?? []).forEach((e: any) => { m[e.id] = e.full_name; });
    setEmpNames(m);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function decideAdvance(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("advance_requests").update({
      status, decided_by: user?.id, decided_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض");
    load();
  }

  async function decideLeave(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("leave_requests").update({
      status, decided_by: user?.id, decided_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض");
    load();
  }

  const pendingAdv = advances.filter((a) => a.status === "pending");
  const pendingLv = leaves.filter((l) => l.status === "pending");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">الطلبات المالية والإجازات</h1>
        <p className="text-sm text-muted-foreground">كل طلبات الموظفين في مكان واحد</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-amber-500" />
          <div>
            <div className="text-2xl font-bold">{pendingAdv.length}</div>
            <div className="text-xs text-muted-foreground">سلف معلقة</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-blue-500" />
          <div>
            <div className="text-2xl font-bold">{pendingLv.length}</div>
            <div className="text-xs text-muted-foreground">طلبات إجازة معلقة</div>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <Tabs defaultValue="advances">
          <TabsList>
            <TabsTrigger value="advances">طلبات السلف ({advances.length})</TabsTrigger>
            <TabsTrigger value="leaves">طلبات الإجازات ({leaves.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="advances">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-start p-3">الموظف</th>
                      <th className="text-start p-3">المبلغ</th>
                      <th className="text-start p-3">السبب</th>
                      <th className="text-start p-3">التاريخ</th>
                      <th className="text-start p-3">الحالة</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {advances.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا توجد طلبات</td></tr>
                    )}
                    {advances.map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="p-3 font-medium">{a.technician_name}</td>
                        <td className="p-3">{fmtMoney(a.amount)}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{a.reason || "—"}</td>
                        <td className="p-3 text-xs">{fmtDate(a.created_at)}</td>
                        <td className="p-3"><StatusBadge s={a.status} /></td>
                        <td className="p-3 text-end">
                          {canDecide && a.status === "pending" && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={() => decideAdvance(a.id, "approved")}>
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => decideAdvance(a.id, "rejected")}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaves">
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
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد طلبات</td></tr>
                    )}
                    {leaves.map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="p-3 font-medium">{empNames[l.employee_id] ?? "—"}</td>
                        <td className="p-3"><Badge variant="secondary">{LEAVE_AR[l.leave_type] ?? l.leave_type}</Badge></td>
                        <td className="p-3 text-xs">{l.start_date}</td>
                        <td className="p-3 text-xs">{l.end_date}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{l.reason || "—"}</td>
                        <td className="p-3"><StatusBadge s={l.status} /></td>
                        <td className="p-3 text-end">
                          {canDecide && l.status === "pending" && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={() => decideLeave(l.id, "approved")}>
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => decideLeave(l.id, "rejected")}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  if (s === "approved") return <Badge className="bg-emerald-600">موافق</Badge>;
  if (s === "rejected") return <Badge variant="destructive">مرفوض</Badge>;
  return <Badge variant="outline">قيد المراجعة</Badge>;
}
