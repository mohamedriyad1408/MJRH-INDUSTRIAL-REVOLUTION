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
import { Loader2, Plus, Search, Eye, Zap, AlertTriangle, PackageOpen, ShieldCheck, RotateCcw, CreditCard, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/orders/")({
  head: () => ({ meta: [{ title: "Orders - MJRH" }] }),
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
      if (tenantId) {
        const { data: br } = await supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at");
        setBranches(br ?? []);
      }
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
      if (!String(r.order_number).includes(s) && !(r.customers?.full_name ?? "").toLowerCase().includes(s) && !(r.customers?.phone ?? "").includes(s)) return false;
    }
    return true;
  });

  const curr = t("common.egp");
  const loc = language === "ar" ? "ar-EG" : "en-US";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={dir}>
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("orders.allOrders")}</h1>
          <div className="flex items-center gap-2 mt-1">
             <Badge variant="outline" className="bg-white text-slate-500 font-bold border-slate-200">
               {filtered.length} {t("stations.common.orders")}
             </Badge>
             {quick !== "all" && <Badge className="bg-brand-blue text-white font-bold">{t(`orders.filter.${quick}`)}</Badge>}
          </div>
        </div>
        {canCreate && (
          <Button asChild className="rounded-2xl h-11 px-6 bg-brand-blue hover:bg-blue-800 shadow-md transition-all">
            <Link to="/orders/new"><Plus className="w-4 h-4 ms-2" /> {t("orders.newOrder")}</Link>
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder={t("orders.searchPlaceholder")} 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pr-11 rounded-2xl border-slate-200 h-11 bg-white" 
              />
            </div>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-48 rounded-2xl border-slate-200 h-11 bg-white font-bold"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-slate-100">
                <SelectItem value="all">{t("common.allBranches")}</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48 rounded-2xl border-slate-200 h-11 bg-white font-bold"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-slate-100">
                <SelectItem value="all">{t("orders.allStatuses")}</SelectItem>
                {Object.keys(ORDER_STATUS_AR).map((k) => <SelectItem key={k} value={k}>{orderStatusLabel(k, t)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {[
              { id: "all", label: t("orders.filter.all"), icon: AlertTriangle },
              { id: "ready_unpaid", label: t("orders.filter.readyUnpaid"), icon: CreditCard },
              { id: "qc", label: t("orders.filter.qc"), icon: ShieldCheck },
              { id: "reclean", label: t("orders.filter.reclean"), icon: RotateCcw },
              { id: "open_pickup", label: t("orders.filter.openPickup"), icon: PackageOpen },
              { id: "payment_review", label: t("orders.filter.paymentReview"), icon: CreditCard },
            ].map((f: any) => (
              <Button 
                key={f.id} 
                size="sm" 
                variant={quick === f.id ? "default" : "outline"} 
                onClick={() => setQuick(f.id)}
                className={`rounded-xl h-9 font-bold px-3 transition-all ${quick === f.id ? "bg-slate-900 border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <f.icon className={`w-3.5 h-3.5 ms-1.5 ${quick === f.id ? "text-white" : "text-slate-400"}`} />
                {f.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-brand-blue" />
          <p className="text-sm font-bold text-slate-400">{t("common.loading")}</p>
        </div>
      ) : (
        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="p-4 text-start font-black text-slate-500 uppercase tracking-widest text-[10px]"># {t("orders.number")}</th>
                  <th className="p-4 text-start font-black text-slate-500 uppercase tracking-widest text-[10px]">{t("orders.customer")}</th>
                  <th className="p-4 text-start font-black text-slate-500 uppercase tracking-widest text-[10px]">{t("orders.status")}</th>
                  <th className="p-4 text-start font-black text-slate-500 uppercase tracking-widest text-[10px]">{t("orders.payment")}</th>
                  <th className="p-4 text-start font-black text-slate-500 uppercase tracking-widest text-[10px]">{t("orders.total")}</th>
                  <th className="p-4 text-start font-black text-slate-500 uppercase tracking-widest text-[10px]">{t("orders.date")}</th>
                  <th className="p-4 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-20 text-center text-slate-400 font-bold">
                       {t("orders.noOrders")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-black text-slate-900">#{r.order_number}</div>
                        {r.is_urgent && (
                          <Badge className="mt-1 bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-black uppercase">
                            <Zap className="w-2.5 h-2.5 ms-1" /> {t("orders.urgent", "Urgent")}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 group-hover:text-brand-blue transition-colors">{r.customers?.full_name ?? "—"}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{r.customers?.phone ?? ""}</div>
                        {r.branches?.name && <div className="text-[10px] text-teal-600 font-bold mt-1 uppercase tracking-tighter">🏢 {r.branches.name}</div>}
                      </td>
                      <td className="p-4">
                         <div className="flex flex-wrap gap-1">
                           <Badge variant="outline" className="rounded-lg bg-slate-50 font-bold border-slate-200 text-slate-700">
                             {orderStatusLabel(r.status, t)}
                           </Badge>
                           {r.open_pickup && <Badge className="bg-blue-600 text-white font-black border-none rounded-lg text-[9px]">{t("orders.badge.openPickup")}</Badge>}
                           {(r.reclean_count ?? 0) > 0 && <Badge className="bg-amber-500 text-white font-black border-none rounded-lg text-[9px]">{t("orders.badge.reclean")}</Badge>}
                           {(r.qc_failed_count ?? 0) > 0 && <Badge variant="destructive" className="font-black border-none rounded-lg text-[9px]">{t("orders.badge.qc")}</Badge>}
                         </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={r.payment_status === "paid" ? "default" : "outline"} className={`rounded-lg font-black border-none ${r.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600 border-red-100 border"}`}>
                          {paymentStatusLabel(r.payment_status, t)}
                        </Badge>
                        {["pending_review", "underpaid"].includes(r.payment_verification_status ?? "") && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-red-700 font-bold animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" /> {t("orders.badge.paymentReview")}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-black text-slate-900">{fmtMoney(r.total, curr)}</td>
                      <td className="p-4 text-[11px] text-slate-400 font-bold leading-tight">{fmtDate(r.created_at, loc)}</td>
                      <td className="p-4">
                        <Button asChild size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-brand-blue hover:text-white transition-all shadow-none">
                          <Link to="/orders/$id" params={{ id: r.id }}><Eye className="w-4 h-4" /></Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
