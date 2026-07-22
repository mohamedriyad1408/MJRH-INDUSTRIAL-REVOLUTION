import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, QrCode, User, FileText, Sparkles, Layers, RefreshCw } from "lucide-react";

export const Route = createLazyFileRoute("/_app/search")({
  component: SearchResultsPage,
});

function SearchResultsPage() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (q?: string) => {
    if (!tenantId) return;
    setLoading(true);
    const { data: o } = await supabase.from("orders").select("*, customers(full_name)").eq("tenant_id", tenantId).limit(10);
    const { data: c } = await supabase.from("customers").select("*").eq("tenant_id", tenantId).limit(10);
    setOrders(o ?? []);
    setCustomers(c ?? []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6" dir={dir}>
      <h1 className="text-2xl font-bold">{t("search.pageTitle")}</h1>
      <Card>
        <CardContent className="p-4 flex gap-2">
          <Input value={query} onChange={(e: any) => setQuery(e.target.value)} placeholder={t("search.inputPlaceholder")} />
          <Button onClick={() => load(query)}>{loading ? <Loader2 className="animate-spin" /> : <Search />}</Button>
        </CardContent>
      </Card>
      
      <div className="grid gap-4">
        {orders.map((o: any) => (
          <Card key={o.id}>
            <CardContent className="p-4 flex justify-between">
              <span>#{o.order_number} - {o.customers?.full_name}</span>
              <Badge>{o.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
