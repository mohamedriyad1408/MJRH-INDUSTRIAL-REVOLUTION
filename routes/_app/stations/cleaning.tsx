import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StationBoard } from "@/components/station-board";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/stations/cleaning")({
  head: () => ({ meta: [{ title: "محطة التنظيف" }] }),
  component: CleaningStation,
});

function CleaningStation() {
  return (
    <div className="space-y-5">
      <StationBoard title="محطة التنظيف" station="cleaning" incoming="received" current="cleaning" nextStatus="ironing" />
      <CleaningReturns />
    </div>
  );
}

type ReturnUnit = {
  id: string;
  label_code: string;
  name: string;
  reclean_reason: string | null;
  order_id: string;
  orders?: { order_number: number; customers?: { full_name: string } | null } | null;
};

function CleaningReturns() {
  const { hasRole } = useAuth();
  const canResolve = hasRole("employee", "ops_manager", "owner");
  const [rows, setRows] = useState<ReturnUnit[]>([]);

  async function load() {
    const { data } = await (supabase as any)
      .from("service_units")
      .select("id,label_code,name,reclean_reason,order_id,orders(order_number,customers(full_name))")
      .eq("needs_reclean", true)
      .order("reclean_reported_at", { ascending: true });
    setRows((data ?? []) as ReturnUnit[]);
  }

  useEffect(() => { load(); }, []);

  async function resolve(id: string) {
    const { error } = await (supabase as any).from("service_units").update({
      needs_reclean: false,
      reclean_resolved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم إنهاء مرتجع التنظيف"); load(); }
  }

  if (!rows.length) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-600" /> مرتجعات التنظيف ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-white p-3">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm flex items-center gap-2">
                {r.label_code} <Badge variant="outline">{r.name}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                طلب #{r.orders?.order_number} · {r.orders?.customers?.full_name ?? "—"}
              </div>
              {r.reclean_reason && <div className="text-xs text-amber-700 mt-1">السبب: {r.reclean_reason}</div>}
            </div>
            <Button asChild size="sm" variant="outline"><Link to="/orders/$id" params={{ id: r.order_id }}>فتح الطلب</Link></Button>
            {canResolve && <Button size="sm" onClick={() => resolve(r.id)}><CheckCircle2 className="w-3 h-3 ms-1" /> تم</Button>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
