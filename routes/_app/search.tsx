import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Loader2, QrCode, Phone, User, FileText,
  Sparkles, Layers, RefreshCw,
} from "lucide-react";

type SearchParams = { q?: string };

export const Route = createFileRoute("/_app/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({ meta: [{ title: "Search - MJRH" }] }),
  component: SearchResultsPage,
});

type OrderMatch = {
  id: string;
  order_number: number;
  status: string;
  total: number;
  created_at: string;
  customers?: { full_name: string; phone: string };
};

type CustomerMatch = {
  id: string;
  full_name: string;
  phone: string;
};

type PieceMatch = {
  id: string;
  order_id: string;
  name: string;
  current_stage: string;
  orders?: { order_number: number; customers?: { full_name: string; phone: string } };
};

function SearchResultsPage() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "orders" | "customers" | "pieces">("all");

  const [orders, setOrders] = useState<OrderMatch[]>([]);
  const [customers, setCustomers] = useState<CustomerMatch[]>([]);
  const [pieces, setPieces] = useState<PieceMatch[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  const loadInitialBrowse = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [oRes, cRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, status, total, created_at, customers(full_name, phone)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(15),
        supabase.from("customers").select("id, full_name, phone").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(15)
      ]);
      if (oRes.data) setOrders(oRes.data as any);
      if (cRes.data) setCustomers(cRes.data as any);
      setPieces([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const performSearch = useCallback(async (qString: string) => {
    const clean = qString.trim();
    if (!clean) {
      loadInitialBrowse();
      return;
    }

    setLoading(true);
    try {
      const esc = clean.replace(/[%_,\\]/g, "\\$&");
      const isNum = !isNaN(Number(clean));
      const numVal = Number(clean);

      const [oRes, cRes, pRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, status, total, created_at, customers(full_name, phone)").eq("tenant_id", tenantId).or(`order_number.eq.${isNum ? numVal : -1},id.ilike.${esc}%`).limit(20),
        supabase.from("customers").select("id, full_name, phone").eq("tenant_id", tenantId).or(`full_name.ilike.%${esc}%,phone.ilike.%${esc.replace(/\s+/g, "")}%`).limit(30),
        supabase.from("service_units").select("id, order_id, name, current_stage, orders!inner(tenant_id, order_number, customers(full_name, phone))").eq("orders.tenant_id", tenantId).or(`id.ilike.${esc}%,name.ilike.%${esc}%`).limit(30)
      ]);

      if (oRes.data) setOrders(oRes.data as any);
      if (cRes.data) setCustomers(cRes.data as any);
      if (pRes.data) setPieces(pRes.data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, loadInitialBrowse]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") || "";
    if (q) {
      setQuery(q);
      performSearch(q);
    } else {
      loadInitialBrowse();
    }
  }, [tenantId, performSearch, loadInitialBrowse]);

  const handleInputChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => performSearch(v), 250);
  };

  const totalCount = orders.length + customers.length + pieces.length;

  const translateStatus = (st: string) => t(`common.status.order.${st}`, st);

  const getStatusColor = (st: string) => {
    if (["delivered", "ready", "completed"].includes(st)) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (["cleaning", "ironing", "drying_assembly", "packing", "qc"].includes(st)) return "bg-blue-100 text-blue-800 border-blue-300";
    if (["out_for_delivery"].includes(st)) return "bg-purple-100 text-purple-800 border-purple-300";
    if (["cancelled"].includes(st)) return "bg-red-100 text-red-800 border-red-300";
    return "bg-amber-100 text-amber-800 border-amber-300";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>{t("search.badge")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">{t("search.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl font-medium leading-relaxed">{t("search.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => performSearch(query)} disabled={loading} className="font-bold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      <Card className="border-2 border-teal-500/30 bg-white shadow-lg rounded-3xl overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="relative flex items-center">
            <Search className={`w-6 h-6 text-teal-600 absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 pointer-events-none`} />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && performSearch(query)}
              placeholder={t("search.inputPlaceholder")}
              className={`h-14 md:h-16 w-full text-base md:text-lg rounded-2xl bg-white border-2 border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 ${dir === 'rtl' ? 'pr-14 pl-28' : 'pl-14 pr-28'} shadow-sm font-semibold text-slate-900 transition`}
            />
            <Button
              onClick={() => performSearch(query)}
              disabled={loading}
              className={`absolute ${dir === 'rtl' ? 'left-2' : 'right-2'} top-2 bottom-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-5 font-bold shadow-md`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "all", label: "tabAll", icon: Layers, count: totalCount },
          { id: "orders", label: "tabOrders", icon: FileText, count: orders.length },
          { id: "customers", label: "tabCustomers", icon: User, count: customers.length },
          { id: "pieces", label: "tabPieces", icon: QrCode, count: pieces.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm transition ${
                active ? "bg-teal-600 text-white shadow-md" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t(`search.${tab.label}`)}</span>
              <Badge className={`ms-1 text-xs px-2 py-0.5 font-mono ${active ? "bg-white/20 text-white" : "bg-white text-slate-800"}`}>
                {tab.count}
              </Badge>
            </button>
          );
        })}
      </div>

      {!loading && totalCount > 0 && (
        <div className="space-y-10">
          {(activeTab === "all" || activeTab === "orders") && orders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-black text-lg text-slate-900">
                <FileText className="w-5 h-5 text-teal-600" />
                <span>{t("search.secOrders")}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((o) => (
                  <Card key={o.id} className="border border-slate-200 hover:border-teal-300 rounded-2xl bg-white shadow-sm hover:shadow-md transition">
                    <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg text-slate-900">#{o.order_number}</span>
                            <Badge className={`text-[11px] font-bold border ${getStatusColor(o.status)}`}>{translateStatus(o.status)}</Badge>
                          </div>
                          <div className="text-sm text-slate-700 font-bold">{o.customers?.full_name}</div>
                        </div>
                        <div className="text-end font-black text-teal-700">{fmtMoney(o.total, t("common.egp"))}</div>
                      </div>
                      <Button asChild size="sm" className="w-full bg-teal-600">
                        <Link to={`/orders/${o.id}` as any}>{t("search.btnOpenOrder")}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(activeTab === "all" || activeTab === "customers") && customers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-black text-lg text-slate-900">
                <User className="w-5 h-5 text-indigo-600" />
                <span>{t("search.secCustomers")}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {customers.map((c) => (
                  <Card key={c.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition">
                    <CardContent className="p-4 space-y-3">
                      <div className="font-black text-base truncate">{c.full_name}</div>
                      <div className="text-sm font-extrabold text-indigo-700 font-mono" dir="ltr">{c.phone}</div>
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link to={`/customers?id=${c.id}` as any}>{t("search.btnCustomerProfile")}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
