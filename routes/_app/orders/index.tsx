import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate, ORDER_STATUS_AR, PAYMENT_STATUS_AR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, Eye, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/orders/")({
  head: () => ({ meta: [{ title: "كل الطلبات" }] }),
  component: OrdersPage,
});

type Row = {
  id: string; order_number: number; status: string; payment_status: string;
  total: number; is_urgent: boolean; created_at: string; customer_id: string;
  customers?: { full_name: string; phone: string } | null;
};

function OrdersPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole("cs_manager", "owner");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, payment_status, total, is_urgent, created_at, customer_id, customers(full_name, phone)")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!String(r.order_number).includes(s) && !(r.customers?.full_name ?? "").includes(search) && !(r.customers?.phone ?? "").includes(search)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">كل الطلبات</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} طلب</p>
        </div>
        {canCreate && <Button asChild><Link to="/orders/new"><Plus className="w-4 h-4 ms-1" /> طلب جديد</Link></Button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="رقم طلب / اسم / تليفون..." value={search} onChange={(e) => setSearch(e.target.value)} className="pe-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(ORDER_STATUS_AR).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3">#</th>
                  <th className="text-start p-3">العميل</th>
                  <th className="text-start p-3">الحالة</th>
                  <th className="text-start p-3">الدفع</th>
                  <th className="text-start p-3">الإجمالي</th>
                  <th className="text-start p-3">التاريخ</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد طلبات</td></tr>}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-bold">
                      #{r.order_number} {r.is_urgent && <Zap className="w-3 h-3 inline text-amber-500" />}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{r.customers?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.customers?.phone ?? ""}</div>
                    </td>
                    <td className="p-3"><Badge variant="secondary">{ORDER_STATUS_AR[r.status] ?? r.status}</Badge></td>
                    <td className="p-3">
                      <Badge variant={r.payment_status === "paid" ? "default" : "outline"}>
                        {PAYMENT_STATUS_AR[r.payment_status] ?? r.payment_status}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium">{fmtMoney(r.total)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="p-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/orders/$id" params={{ id: r.id }}><Eye className="w-4 h-4" /></Link>
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
