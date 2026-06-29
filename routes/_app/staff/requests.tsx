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
import { useI18n } from "@/lib/i18n";

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

function RequestsPage() {
  const { t, dir } = useI18n();
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
    toast.success(status === "approved" ? t("requests.toastApproved", "تمت الموافقة") : t("requests.toastRejected", "تم الرفض"));
    load();
  }

  async function decideLeave(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("leave_requests").update({
      status, decided_by: user?.id, decided_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? t("requests.toastApproved", "تمت الموافقة") : t("requests.toastRejected", "تم الرفض"));
    load();
  }

  const pendingAdv = advances.filter((a) => a.status === "pending");
  const pendingLv = leaves.filter((l) => l.status === "pending");
  const curr = t("common.egp");

  function leaveTypeLabel(s: string) {
    return ({ annual: t("leave.annual", "اعتيادية"), sick: t("leave.sick", "مرضية"), unpaid: t("leave.unpaid", "بدون أجر"), emergency: t("leave.emergency", "طارئة") } as Record<string,string>)[s] ?? s;
  }

  return (
    <div className="space-y-4" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold">{t("requests.title", "الطلبات المالية والإجازات")}</h1>
        <p className="text-sm text-muted-foreground">{t("requests.subtitle", "كل طلبات الموظفين في مكان واحد")}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-amber-500" />
          <div>
            <div className="text-2xl font-bold">{pendingAdv.length}</div>
            <div className="text-xs text-muted-foreground">{t("requests.pendingAdv", "سلف معلقة")}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-blue-500" />
          <div>
            <div className="text-2xl font-bold">{pendingLv.length}</div>
            <div className="text-xs text-muted-foreground">{t("requests.pendingLv", "طلبات إجازة معلقة")}</div>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <Tabs defaultValue="advances">
          <TabsList>
            <TabsTrigger value="advances">{t("requests.tabAdv", "طلبات السلف")} ({advances.length})</TabsTrigger>
            <TabsTrigger value="leaves">{t("requests.tabLv", "طلبات الإجازات")} ({leaves.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="advances">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-start p-3">{t("requests.employee", "الموظف")}</th>
                      <th className="text-start p-3">{t("requests.amount", "المبلغ")}</th>
                      <th className="text-start p-3">{t("requests.reason", "السبب")}</th>
                      <th className="text-start p-3">{t("requests.date", "التاريخ")}</th>
                      <th className="text-start p-3">{t("requests.status", "الحالة")}</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {advances.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t("requests.empty", "لا توجد طلبات")}</td></tr>
                    )}
                    {advances.map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="p-3 font-medium">{a.technician_name}</td>
                        <td className="p-3">{fmtMoney(a.amount, curr)}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{a.reason || "—"}</td>
                        <td className="p-3 text-xs">{fmtDate(a.created_at)}</td>
                        <td className="p-3"><StatusBadge s={a.status} t={t} /></td>
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
                      <th className="text-start p-3">{t("requests.employee", "الموظف")}</th>
                      <th className="text-start p-3">{t("requests.type", "النوع")}</th>
                      <th className="text-start p-3">{t("requests.from", "من")}</th>
                      <th className="text-start p-3">{t("requests.to", "إلى")}</th>
                      <th className="text-start p-3">{t("requests.reason", "السبب")}</th>
                      <th className="text-start p-3">{t("requests.status", "الحالة")}</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{t("requests.empty", "لا توجد طلبات")}</td></tr>
                    )}
                    {leaves.map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="p-3 font-medium">{empNames[l.employee_id] ?? "—"}</td>
                        <td className="p-3"><Badge variant="secondary">{leaveTypeLabel(l.leave_type)}</Badge></td>
                        <td className="p-3 text-xs">{l.start_date}</td>
                        <td className="p-3 text-xs">{l.end_date}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{l.reason || "—"}</td>
                        <td className="p-3"><StatusBadge s={l.status} t={t} /></td>
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

function StatusBadge({ s, t }: { s: string; t: any }) {
  if (s === "approved") return <Badge className="bg-emerald-600">{t("requests.approved", "موافق")}</Badge>;
  if (s === "rejected") return <Badge variant="destructive">{t("requests.rejected", "مرفوض")}</Badge>;
  return <Badge variant="outline">{t("requests.pending", "قيد المراجعة")}</Badge>;
}
