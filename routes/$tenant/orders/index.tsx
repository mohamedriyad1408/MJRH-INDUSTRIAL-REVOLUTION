import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate, orderStatusLabel, paymentStatusLabel, ORDER_STATUS_AR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, Eye, Zap, AlertTriangle, PackageOpen, ShieldCheck, RotateCcw, CreditCard } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/orders/")({
  head: () => ({ meta: [{ title: "كل الطلبات" }] }),
  component: OrdersPage,
});

type Row = {
  id: string; order_number: number; status: string; payment_status: string; payment_verification_status?: string | null; invoice_finalized_at?: string | null;
  total: number; is_urgent: boolean; created_at: string; customer_id: string;
  customers?: { full_name: string; phone: string } | null; branch_id?: string | null; branches?: { name: string } | null;
  pieces_count?: number; reclean_count?: number; qc_failed_count?: number; open_pickup?: boolean;
};

function OrdersPage() {
  const { hasRole, tenantId } = useAuth();
  const { t, dir, language } = useI18n();
  const canCreate = hasRole("cs_manager", "owner");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [quick, setQuick] = useState("all");
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");

  async function load() {
    setLoading(true);
    try {
      if (tenantId) supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at").then(({ data }: any) => setBranches(data ?? []));
      let q = supabase
        .from("orders")
        .select("id, order_number, status, payment_status, payment_verification_status, invoice_finalized_at, total, is_urgent, created_at, customer_id, branch_id, customers(full_name, phone), branches(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (branchId !== "all") q = q.eq("branch_id", branchId);
      const { data, error } = await q;
      if (error) throw error;
      const base = (data ?? []) as any[];
      const ids = base.map((r) => r.id);
      const [unitsRes, pickupsRes] = await Promise.all([
        ids.length ? supabase.from("service_units").select("order_id,needs_reclean,current_stage,status").in("order_id", ids) : Promise.resolve({ data: [] }),
        ids.length ? supabase.from("pickup_requests").select("converted_order_id,status").in("converted_order_id", ids).in("status", ["pending", "assigned"]) : Promise.resolve({ data: [] }),
      ]);
      const unitMap = new Map<string, any>();
      (unitsRes.data ?? []).forEach((u: any) => {
        const x = unitMap.get(u.order_id) ?? { pieces_count: 0, reclean_count: 0, qc_failed_count: 0 };
        if (u.status !== "cancelled" && u.current_stage !== "cancelled") x.pieces_count += 1;
        if (u.needs_reclean) x.reclean_count += 1;
        if (u.current_stage === "qc_failed") x.qc_failed_count += 1;
        unitMap.set(u.order_id, x);
      });
      const openPickup = new Set((pickupsRes.data ?? []).map((p: any) => p.converted_order_id));
      setRows(base.map((r) => ({ ...r, ...(unitMap.get(r.id) ?? { pieces_count: 0, reclean_count: 0, qc_failed_count: 0 }), open_pickup: openPickup.has(r.id) })) as any);
    } catch (e: any) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [tenantId, branchId]);

  const filtered = rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (quick === "no_pieces" && (r.pieces_count ?? 0) > 0) return false;
    if (quick === "reclean" && !(r.reclean_count ?? 0)) return false;
    if (quick === "qc" && !(r.qc_failed_count ?? 0)) return false;
    if (quick === "payment_review" && !["pending_review", "underpaid"].includes(r.payment_verification_status ?? "")) return false;
    if (quick === "invoice_review" && !( ["packing", "ready"].includes(r.status) && !r.invoice_finalized_at)) return false;
    if (quick === "open_pickup" && !r.open_pickup) return false;
    if (quick === "ready_unpaid" && !( ["ready", "out_for_delivery"].includes(r.status) && r.payment_status !== "paid")) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!String(r.order_number).includes(s) && !(r.customers?.full_name ?? "").includes(search) && !(r.customers?.phone ?? "").includes(search)) return false;
    }
    return true;
  });

  const curr = t("common.egp");
  const loc = language === "ar" ? "ar-EG" : "en-US";

  return (
    <div className="space-y-4" dir={dir}>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("orders.allOrders")}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {t("station.common.orders")}</p>
        </div>
        {canCreate && <Button asChild><Link to={"/$tenant/orders/new" as any}><Plus className="w-4 h-4 ms-1" /> {t("orders.newOrder")}</Link></Button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("orders.searchPlaceholder", "رقم طلب / اسم / تليفون...")} value={search} onChange={(e) => setSearch(e.target.value)} className="pe-9" />
        </div>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-48"><SelectValue placeholder={t("common.branch")} /></SelectTrigger>
          <SelectContent><SelectItem value="all">{t("common.allBranches")}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("orders.allStatuses")}</SelectItem>
            {Object.keys(ORDER_STATUS_AR).map((k) => <SelectItem key={k} value={k}>{orderStatusLabel(k, t)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["all", t("orders.filter.all", "الكل"), AlertTriangle],
          ["open_pickup", t("orders.filter.openPickup", "استلامات مفتوحة"), PackageOpen],
          ["no_pieces", t("orders.filter.noPieces", "بلا قطع"), PackageOpen],
          ["reclean", t("orders.filter.reclean", "مرتجعات"), RotateCcw],
          ["qc", t("orders.filter.qc", "مشاكل جودة"), ShieldCheck],
          ["invoice_review", t("orders.filter.invoiceReview", "فواتير تحتاج اعتماد"), CreditCard],
          ["payment_review", t("orders.filter.paymentReview", "إيصالات تحتاج مراجعة"), CreditCard],
          ["ready_unpaid", t("orders.filter.readyUnpaid", "جاهز غير مدفوع"), CreditCard],
        ].map(([k, label, Icon]: any) => <Button key={k} size="sm" variant={quick === k ? "default" : "outline"} onClick={() => setQuick(k)}><Icon className="w-3 h-3 ms-1" />{label}</Button>)}
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
                  <th className="text-start p-3">{t("orders.customer")}</th>
                  <th className="text-start p-3">{t("orders.status")}</th>
                  <th className="text-start p-3">{t("orders.payment")}</th>
                  <th className="text-start p-3">{t("orders.total")}</th>
                  <th className="text-start p-3">{t("orders.date")}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{t("orders.noOrders")}</td></tr>}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-bold">
                      #{r.order_number} {r.is_urgent && <Zap className="w-3 h-3 inline text-amber-500" />}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{r.customers?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.customers?.phone ?? ""}</div>{r.branches?.name && <div className="text-xs text-teal-600">{r.branches.name}</div>}
                    </td>
                    <td className="p-3"><div className="flex flex-wrap gap-1"><Badge variant="secondary">{orderStatusLabel(r.status, t)}</Badge>{r.open_pickup && <Badge className="bg-blue-600">{t("orders.badge.openPickup", "استلام مفتوح")}</Badge>}{(r.pieces_count ?? 0) === 0 && <Badge variant="destructive">{t("orders.badge.noPieces", "بلا قطع")}</Badge>}{(r.reclean_count ?? 0) > 0 && <Badge className="bg-amber-500">{t("orders.badge.reclean", "مرتجع")}</Badge>}{(r.qc_failed_count ?? 0) > 0 && <Badge variant="destructive">{t("orders.badge.qc", "جودة")}</Badge>}</div></td>
                    <td className="p-3">
                      <Badge variant={r.payment_status === "paid" ? "default" : "outline"}>
                        {paymentStatusLabel(r.payment_status, t)}
                      </Badge>
                      {["pending_review", "underpaid"].includes(r.payment_verification_status ?? "") && <Badge variant="destructive" className="me-1">{t("orders.badge.paymentReview", "إيصال مراجعة")}</Badge>}
                    </td>
                    <td className="p-3 font-medium">{fmtMoney(r.total, curr)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{fmtDate(r.created_at, loc)}</td>
                    <td className="p-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link to={"/$tenant/orders/$id" as any} params={{ id: r.id } as any}><Eye className="w-4 h-4" /></Link>
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
