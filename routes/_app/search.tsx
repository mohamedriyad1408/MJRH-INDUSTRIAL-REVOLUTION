import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Loader2, QrCode, Phone, User, FileText, Package,
  AlertTriangle, X, Sparkles, Wallet, CheckCircle2, ArrowLeft, ArrowRight,
  Filter, Layers, Calendar, ExternalLink, Plus,
} from "lucide-react";

type SearchParams = { q?: string };

export const Route = createFileRoute("/_app/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({ meta: [{ title: "مركز البحث الموحد والنتائج" }] }),
  component: SearchResultsPage,
});

type OrderMatch = {
  id: string;
  order_number: number;
  status: string;
  total: number;
  created_at: string;
  notes?: string;
  customers?: { full_name: string; phone: string };
};

type CustomerMatch = {
  id: string;
  full_name: string;
  phone: string;
  address?: string;
  notes?: string;
  created_at: string;
};

type PieceMatch = {
  id: string;
  order_id: string;
  name: string;
  current_stage: string;
  status: string;
  created_at: string;
  orders?: { order_number: number; customers?: { full_name: string; phone: string } };
};

type FinanceMatch = {
  id: string;
  amount: number;
  transaction_type: string;
  description?: string;
  created_at: string;
  customers?: { full_name: string; phone: string };
};

function SearchResultsPage() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "orders" | "customers" | "pieces" | "finance">("all");

  const [orders, setOrders] = useState<OrderMatch[]>([]);
  const [customers, setCustomers] = useState<CustomerMatch[]>([]);
  const [pieces, setPieces] = useState<PieceMatch[]>([]);
  const [financials, setFinancials] = useState<FinanceMatch[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Mark search as open to prevent motivational popups
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-search-open", "true");
      return () => {
        document.body.removeAttribute("data-search-open");
      };
    }
  }, []);

  // Initialize query from URL and listen to topbar updates
  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("q") || "";
      if (q && q !== query) {
        setQuery(q);
        performSearch(q);
      } else if (!q) {
        // If empty, load recent orders/customers as default browse
        loadInitialBrowse();
      }

      const handleCustomUpdate = (e: any) => {
        const val = e.detail ?? "";
        setQuery(val);
        performSearch(val);
      };
      window.addEventListener("mjrh-search-update", handleCustomUpdate);
      return () => window.removeEventListener("mjrh-search-update", handleCustomUpdate);
    }
  }, [tenantId]);

  const loadInitialBrowse = async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantFilter = tenantId ? `.eq("tenant_id", tenantId)` : "";
      const oPromise = supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, notes, customers(full_name, phone)")
        .order("created_at", { ascending: false })
        .limit(15);
      
      const cPromise = supabase
        .from("customers")
        .select("id, full_name, phone, address, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(15);

      if (tenantId) {
        oPromise.eq("tenant_id", tenantId);
        cPromise.eq("tenant_id", tenantId);
      }

      const [oRes, cRes] = await Promise.all([oPromise, cPromise]);
      if (oRes.data) setOrders(oRes.data as any);
      if (cRes.data) setCustomers(cRes.data as any);
      setPieces([]);
      setFinancials([]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = useCallback(async (qString: string) => {
    const clean = qString.trim();
    if (!clean) {
      loadInitialBrowse();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const esc = clean.replace(/[%_,\\]/g, "\\$&");
      const isNum = !isNaN(Number(clean));
      const numVal = Number(clean);

      const oJobs: Promise<any>[] = [];
      const cJobs: Promise<any>[] = [];
      const pJobs: Promise<any>[] = [];
      const fJobs: Promise<any>[] = [];

      // 1. Orders
      if (isNum) {
        let q = supabase.from("orders").select("id, order_number, status, total, created_at, notes, customers(full_name, phone)").eq("order_number", numVal).limit(20);
        if (tenantId) q = q.eq("tenant_id", tenantId);
        oJobs.push(q);
      }
      {
        let q1 = supabase.from("orders").select("id, order_number, status, total, created_at, notes, customers(full_name, phone)").ilike("id", `${esc}%`).limit(20);
        if (tenantId) q1 = q1.eq("tenant_id", tenantId);
        oJobs.push(q1);
      }

      // 2. Customers
      {
        let q1 = supabase.from("customers").select("id, full_name, phone, address, notes, created_at").ilike("full_name", `%${esc}%`).limit(30);
        let q2 = supabase.from("customers").select("id, full_name, phone, address, notes, created_at").ilike("phone", `%${esc.replace(/\s+/g, "")}%`).limit(30);
        if (tenantId) {
          q1 = q1.eq("tenant_id", tenantId);
          q2 = q2.eq("tenant_id", tenantId);
        }
        cJobs.push(q1, q2);
      }

      // 3. Pieces / Service Units
      {
        let q1 = supabase.from("service_units").select("id, order_id, name, current_stage, status, created_at, orders!inner(tenant_id, order_number, customers(full_name, phone))").ilike("id", `${esc}%`).limit(30);
        let q2 = supabase.from("service_units").select("id, order_id, name, current_stage, status, created_at, orders!inner(tenant_id, order_number, customers(full_name, phone))").ilike("name", `%${esc}%`).limit(30);
        if (tenantId) {
          q1 = q1.eq("orders.tenant_id", tenantId);
          q2 = q2.eq("orders.tenant_id", tenantId);
        }
        pJobs.push(q1, q2);
      }

      // 4. Financial Ledgers
      if (isNum) {
        let q1 = supabase.from("customer_financial_ledger").select("id, amount, transaction_type, description, created_at, customers(full_name, phone)").eq("amount", numVal).limit(20);
        if (tenantId) q1 = q1.eq("tenant_id", tenantId);
        fJobs.push(q1);
      }
      {
        let q2 = supabase.from("customer_financial_ledger").select("id, amount, transaction_type, description, created_at, customers(full_name, phone)").ilike("description", `%${esc}%`).limit(20);
        if (tenantId) q2 = q2.eq("tenant_id", tenantId);
        fJobs.push(q2);
      }

      const [oRes, cRes, pRes, fRes] = await Promise.all([
        Promise.allSettled(oJobs),
        Promise.allSettled(cJobs),
        Promise.allSettled(pJobs),
        Promise.allSettled(fJobs),
      ]);

      // Deduplicate orders
      const oMap = new Map<string, OrderMatch>();
      oRes.forEach((res) => {
        if (res.status === "fulfilled" && res.value.data) {
          res.value.data.forEach((item: any) => oMap.set(item.id, item));
        }
      });
      setOrders(Array.from(oMap.values()));

      // Deduplicate customers
      const cMap = new Map<string, CustomerMatch>();
      cRes.forEach((res) => {
        if (res.status === "fulfilled" && res.value.data) {
          res.value.data.forEach((item: any) => cMap.set(item.id, item));
        }
      });
      setCustomers(Array.from(cMap.values()));

      // Deduplicate pieces
      const pMap = new Map<string, PieceMatch>();
      pRes.forEach((res) => {
        if (res.status === "fulfilled" && res.value.data) {
          res.value.data.forEach((item: any) => pMap.set(item.id, item));
        }
      });
      setPieces(Array.from(pMap.values()));

      // Deduplicate finance
      const fMap = new Map<string, FinanceMatch>();
      fRes.forEach((res) => {
        if (res.status === "fulfilled" && res.value.data) {
          res.value.data.forEach((item: any) => fMap.set(item.id, item));
        }
      });
      setFinancials(Array.from(fMap.values()));

    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const handleInputChange = (v: string) => {
    setQuery(v);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", `/search${v.trim() ? `?q=${encodeURIComponent(v.trim())}` : ""}`);
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => performSearch(v), 250);
  };

  const handleExampleClick = (ex: string) => {
    setQuery(ex);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", `/search?q=${encodeURIComponent(ex)}`);
    }
    performSearch(ex);
  };

  const totalCount = orders.length + customers.length + pieces.length + financials.length;

  const translateStatus = (st: string) => {
    const map: Record<string, string> = {
      open: "مفتوح",
      received: "استقبال",
      cleaning: "غسيل",
      ironing: "كي",
      drying_assembly: "تجفيف وتجميع",
      packing: "تغليف",
      qc: "فحص الجودة",
      ready: "جاهز للتسليم",
      out_for_delivery: "خرج للتسليم",
      delivered: "تم التسليم",
      cancelled: "ملغي",
      completed: "مكتمل",
    };
    return map[st] || st;
  };

  const getStatusColor = (st: string) => {
    if (["delivered", "ready", "completed"].includes(st)) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (["cleaning", "ironing", "drying_assembly", "packing", "qc"].includes(st)) return "bg-blue-100 text-blue-800 border-blue-300";
    if (["out_for_delivery"].includes(st)) return "bg-purple-100 text-purple-800 border-purple-300";
    if (["cancelled"].includes(st)) return "bg-red-100 text-red-800 border-red-300";
    return "bg-amber-100 text-amber-800 border-amber-300";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16" dir={dir}>
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>{t("searchPage.badge", "منظومة البحث الموحد العميقة")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            {t("searchPage.title", "مركز البحث الموحد والنتائج")}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl font-medium leading-relaxed">
            {t("searchPage.subtitle", "بحث فوري وغير عائم في كافة سجلات الطلبات، العملاء، قطع الملابس ومراحل التشغيل، والقيود المالية في مكان واحد واضح.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!tenantId && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t("searchPage.demoMode", "وضع استعراض عام — لم يتم اختيار مغسلة")}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => performSearch(query)} disabled={loading} className="font-bold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Search className="w-4 h-4 ms-1" />}
            {t("common.refresh", "تحديث النتائج")}
          </Button>
        </div>
      </div>

      {/* Main Search Input Section (Non-Floating Box) */}
      <Card className="border-2 border-teal-500/30 bg-gradient-to-br from-white via-slate-50/50 to-teal-50/20 shadow-lg rounded-3xl overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="relative flex items-center">
            <Search className="w-6 h-6 text-teal-600 absolute start-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && performSearch(query)}
              placeholder={t("searchPage.inputPlaceholder", "اكتب هنا رقم الطلب (مثال: 91)، رقم الهاتف، كود QR، اسم العميل، أو وصف القيد المالي...")}
              autoFocus
              className="h-14 md:h-16 w-full text-base md:text-lg rounded-2xl bg-white border-2 border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 ps-14 pe-28 shadow-sm font-semibold text-slate-900 transition"
            />

            {query && (
              <button
                type="button"
                onClick={() => handleInputChange("")}
                className="absolute end-16 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 rounded-lg transition"
                title="مسح البحث"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <Button
              onClick={() => performSearch(query)}
              disabled={loading}
              className="absolute end-2 top-2 bottom-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-5 font-bold shadow-md transition flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="hidden sm:inline">{t("searchPage.btnSearch", "بحث")}</span>
            </Button>
          </div>

          {/* Quick Examples Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-slate-600">
            <span className="text-muted-foreground">{t("searchPage.tryExamplesLabel", "أمثلة سريعة للبحث:")}</span>
            {[
              { label: "رقم طلب: 91", val: "91" },
              { label: "رقم طلب: 34", val: "34" },
              { label: "هاتف: 010", val: "010" },
              { label: "كود قطعة: QR-", val: "QR-" },
              { label: "اسم: محمد", val: "محمد" },
            ].map((ex) => (
              <button
                key={ex.val}
                onClick={() => handleExampleClick(ex.val)}
                className="px-3 py-1 rounded-full bg-white hover:bg-teal-100 hover:text-teal-900 border border-slate-200 text-slate-700 transition shadow-xs font-bold"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 font-bold flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <div className="text-sm">{t("searchPage.errTitle", "حدث خطأ أثناء البحث")}</div>
            <div className="text-xs font-mono font-normal text-red-600 mt-0.5" dir="ltr">{error}</div>
          </div>
        </div>
      )}

      {/* Category Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm transition ${
            activeTab === "all"
              ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t("searchPage.tabAll", "كل النتائج")}</span>
          <Badge className={`ms-1 text-xs px-2 py-0.5 font-mono ${activeTab === "all" ? "bg-white/20 text-white" : "bg-white text-slate-800"}`}>
            {totalCount}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition ${
            activeTab === "orders"
              ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t("searchPage.tabOrders", "الطلبات")}</span>
          <Badge className={`ms-1 text-xs px-2 py-0.5 font-mono ${activeTab === "orders" ? "bg-white/20 text-white" : "bg-white text-slate-800"}`}>
            {orders.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition ${
            activeTab === "customers"
              ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t("searchPage.tabCustomers", "العملاء")}</span>
          <Badge className={`ms-1 text-xs px-2 py-0.5 font-mono ${activeTab === "customers" ? "bg-white/20 text-white" : "bg-white text-slate-800"}`}>
            {customers.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("pieces")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition ${
            activeTab === "pieces"
              ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>{t("searchPage.tabPieces", "القطع ومراحل العمل")}</span>
          <Badge className={`ms-1 text-xs px-2 py-0.5 font-mono ${activeTab === "pieces" ? "bg-white/20 text-white" : "bg-white text-slate-800"}`}>
            {pieces.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("finance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition ${
            activeTab === "finance"
              ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>{t("searchPage.tabFinance", "القيود المالية")}</span>
          <Badge className={`ms-1 text-xs px-2 py-0.5 font-mono ${activeTab === "finance" ? "bg-white/20 text-white" : "bg-white text-slate-800"}`}>
            {financials.length}
          </Badge>
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="py-16 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto" />
          <div className="font-extrabold text-slate-700 text-base">{t("searchPage.loadingText", "جاري البحث الفوري في جميع قواعد البيانات...")}</div>
        </div>
      )}

      {/* Empty State when no results found */}
      {!loading && totalCount === 0 && query.trim().length > 0 && !error && (
        <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50 p-12 text-center rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">{t("searchPage.noResultsTitle", "لم يتم العثور على أي نتائج مطابقة")}</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
            {t("searchPage.noResultsBody", "تأكد من صحة رقم الطلب أو رقم الهاتف، أو جرب كتابة أول 6 حروف من كود QR أو اسم العميل بدون ألقاب.")}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => handleInputChange("")} className="font-bold">
              {t("searchPage.btnClearQuery", "مسح البحث والعودة")}
            </Button>
            <Link to="/orders/new">
              <Button className="bg-teal-600 hover:bg-teal-700 font-bold">
                <Plus className="w-4 h-4 ms-1" /> {t("searchPage.btnNewOrder", "إنشاء طلب جديد")}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Empty State when no query and no initial data */}
      {!loading && totalCount === 0 && !query.trim() && !error && (
        <div className="py-12 text-center space-y-6">
          <div className="flex justify-center gap-4 text-slate-400">
            <FileText className="w-12 h-12" />
            <User className="w-12 h-12" />
            <QrCode className="w-12 h-12" />
          </div>
          <div className="text-base font-bold text-slate-600 max-w-md mx-auto">
            {t("searchPage.emptyPrompt", "ابدأ بكتابة أي كلمة أو رقم في مربع البحث أعلاه لعرض النتائج اللحظية من جميع السجلات في مكان واحد.")}
          </div>
        </div>
      )}

      {/* Results Display Area */}
      {!loading && totalCount > 0 && (
        <div className="space-y-10">
          
          {/* SECTION 1: ORDERS */}
          {(activeTab === "all" || activeTab === "orders") && orders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-lg text-slate-900">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <span>{t("searchPage.secOrders", "الطلبات والفواتير")}</span>
                  <Badge className="bg-teal-100 text-teal-800 border-teal-200 font-mono text-xs">{orders.length}</Badge>
                </div>
                {activeTab === "all" && orders.length > 5 && (
                  <button onClick={() => setActiveTab("orders")} className="text-xs text-teal-600 hover:underline font-bold">
                    {t("searchPage.viewAllOrders", "عرض كل الطلبات")} ({orders.length}) &larr;
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === "all" ? orders.slice(0, 6) : orders).map((o) => (
                  <Card key={o.id} className="border border-slate-200 hover:border-teal-300 transition shadow-xs hover:shadow-md rounded-2xl overflow-hidden bg-white">
                    <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg text-slate-900">طلب #{o.order_number || o.id.slice(0, 8)}</span>
                            <Badge className={`text-[11px] font-bold px-2.5 py-0.5 border ${getStatusColor(o.status)}`}>
                              {translateStatus(o.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{o.customers?.full_name || t("search.unnamed", "بدون اسم")}</span>
                          </div>
                          {o.customers?.phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono" dir="ltr">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{o.customers.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-end shrink-0">
                          <div className="font-black text-lg text-teal-700 font-mono">{Number(o.total || 0).toFixed(2)} ج.م</div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1 mt-1 font-medium">
                            <Calendar className="w-3 h-3" />
                            <span>{fmtDate(o.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {o.notes && (
                        <div className="text-xs bg-slate-50 border border-slate-100 p-2 rounded-xl text-slate-600 italic">
                          "{o.notes}"
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Link to={`/orders/${o.id}` as any} className="w-full">
                          <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs">
                            <FileText className="w-4 h-4 ms-1.5" />
                            <span>{t("searchPage.btnOpenOrder", "فتح تفاصيل الطلب والفاتورة")}</span>
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: CUSTOMERS */}
          {(activeTab === "all" || activeTab === "customers") && customers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-lg text-slate-900">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span>{t("searchPage.secCustomers", "العملاء المسجلون")}</span>
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-mono text-xs">{customers.length}</Badge>
                </div>
                {activeTab === "all" && customers.length > 5 && (
                  <button onClick={() => setActiveTab("customers")} className="text-xs text-indigo-600 hover:underline font-bold">
                    {t("searchPage.viewAllCustomers", "عرض كل العملاء")} ({customers.length}) &larr;
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(activeTab === "all" ? customers.slice(0, 6) : customers).map((c) => (
                  <Card key={c.id} className="border border-slate-200 hover:border-indigo-300 transition shadow-xs hover:shadow-md rounded-2xl overflow-hidden bg-white">
                    <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-black text-base text-slate-900 truncate">{c.full_name || t("search.unnamed", "بدون اسم")}</div>
                          <Badge variant="outline" className="bg-slate-50 text-[10px] font-mono text-slate-500 shrink-0">
                            ID: {c.id.slice(0, 6)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-700 font-mono" dir="ltr">
                          <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>{c.phone || "—"}</span>
                        </div>

                        {c.address && (
                          <div className="text-xs text-slate-500 truncate" title={c.address}>
                            📍 {c.address}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                        <Link to={`/customers?id=${c.id}` as any} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl">
                            <User className="w-3.5 h-3.5 ms-1" />
                            <span>{t("searchPage.btnCustomerProfile", "ملف العميل")}</span>
                          </Button>
                        </Link>
                        <Link to="/orders/new" className="flex-1">
                          <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
                            <Plus className="w-3.5 h-3.5 ms-1" />
                            <span>{t("searchPage.btnNewOrderForCust", "طلب جديد")}</span>
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: PIECES AND WORKSTATIONS */}
          {(activeTab === "all" || activeTab === "pieces") && pieces.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-lg text-slate-900">
                  <QrCode className="w-5 h-5 text-amber-600" />
                  <span>{t("searchPage.secPieces", "قطع الملابس ومراحل التشغيل (QR / الباركود)")}</span>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-mono text-xs">{pieces.length}</Badge>
                </div>
                {activeTab === "all" && pieces.length > 5 && (
                  <button onClick={() => setActiveTab("pieces")} className="text-xs text-amber-600 hover:underline font-bold">
                    {t("searchPage.viewAllPieces", "عرض كل القطع")} ({pieces.length}) &larr;
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === "all" ? pieces.slice(0, 6) : pieces).map((u) => (
                  <Card key={u.id} className="border border-slate-200 hover:border-amber-300 transition shadow-xs hover:shadow-md rounded-2xl overflow-hidden bg-white">
                    <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-extrabold text-base text-slate-900">{u.name || t("search.piece", "قطعة ملابس")}</div>
                          <div className="font-mono text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                            QR-{u.id.slice(0, 8)}
                          </div>
                          {u.orders?.order_number && (
                            <div className="text-xs font-bold text-slate-600 mt-1">
                              تابع للطلب: <span className="font-black text-teal-700">#{u.orders.order_number}</span>
                              {u.orders.customers?.full_name && ` • (${u.orders.customers.full_name})`}
                            </div>
                          )}
                        </div>

                        <div className="text-end shrink-0 space-y-1">
                          <div className="text-[11px] font-bold text-slate-500">المحطة الحالية</div>
                          <Badge className="bg-indigo-50 border-indigo-200 text-indigo-800 font-extrabold text-xs">
                            {translateStatus(u.current_stage || u.status || "open")}
                          </Badge>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <Link to={`/orders/${u.order_id}` as any} className="w-full">
                          <Button size="sm" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl">
                            <ExternalLink className="w-4 h-4 ms-1.5" />
                            <span>{t("searchPage.btnOpenParentOrder", "عرض القطعة في الطلب الرئيسي")}</span>
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: FINANCIAL LEDGER */}
          {(activeTab === "all" || activeTab === "finance") && financials.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-lg text-slate-900">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  <span>{t("searchPage.secFinance", "القيود المالية والمبالغ")}</span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-mono text-xs">{financials.length}</Badge>
                </div>
                {activeTab === "all" && financials.length > 5 && (
                  <button onClick={() => setActiveTab("finance")} className="text-xs text-emerald-600 hover:underline font-bold">
                    {t("searchPage.viewAllFinance", "عرض كل القيود")} ({financials.length}) &larr;
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === "all" ? financials.slice(0, 6) : financials).map((f) => (
                  <Card key={f.id} className="border border-slate-200 hover:border-emerald-300 transition shadow-xs rounded-2xl overflow-hidden bg-white">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 truncate">
                          {f.description || f.transaction_type || t("searchPage.ledgerEntry", "قيد مالي")}
                        </div>
                        {f.customers?.full_name && (
                          <div className="text-xs text-slate-600 font-semibold truncate">
                            👤 {f.customers.full_name} ({f.customers.phone})
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 font-medium">
                          {fmtDate(f.created_at)}
                        </div>
                      </div>

                      <div className="text-end shrink-0 font-mono font-black text-base text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                        {Number(f.amount || 0).toFixed(2)} ج.م
                      </div>
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
