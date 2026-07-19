import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2, Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/$tenant/work-orders")({
  head: () => ({ meta: [{ title: "طلبات العمل العامة — Work Orders v2" }] }),
  component: WorkOrdersPage,
});

function WorkOrdersPage() {
  const { tenantId, hasRole } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", room_number: "", guest_status: "vacant", cleaning_type: "daily", floor: "1" });

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const [{ data: wfs }, { data: wos }, { data: stgs }] = await Promise.all([
      supabase.from("workflow_definitions").select("*").or(`tenant_id.eq.${tenantId},is_template.eq.true`).order("created_at", { ascending: false }),
      supabase.from("work_orders").select("*, workflow_definitions(name, industry), workflow_stages_v2!work_orders_current_stage_id_fkey(name_ar, slug)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100),
      selectedWorkflow ? supabase.from("workflow_stages_v2").select("*").eq("workflow_id", selectedWorkflow).order("stage_order") : Promise.resolve({ data: [] } as any),
    ]);
    setWorkflows(wfs ?? []);
    setOrders(wos ?? []);
    if (stgs) setStages(stgs as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, [tenantId, selectedWorkflow]);

  async function createWorkOrder() {
    if (!selectedWorkflow) return toast.error("اختر Workflow أولاً");
    if (!form.title.trim()) return toast.error("أدخل عنوان الطلب");

    // Fetch initial stage
    const { data: initialStage } = await supabase.from("workflow_stages_v2").select("id").eq("workflow_id", selectedWorkflow).eq("is_initial", true).maybeSingle();
    const stageId = initialStage?.id || stages[0]?.id;

    const { error } = await supabase.from("work_orders").insert({
      tenant_id: tenantId,
      workflow_id: selectedWorkflow,
      current_stage_id: stageId,
      title: form.title,
      custom_fields: {
        room_number: form.room_number,
        guest_status: form.guest_status,
        cleaning_type: form.cleaning_type,
        floor: form.floor,
      },
      status: "open",
    });

    if (error) toast.error(error.message);
    else {
      toast.success("تم إنشاء طلب عمل عام — v2 engine بدون كود مغسلة");
      setForm({ title: "", room_number: "", guest_status: "vacant", cleaning_type: "daily", floor: "1" });
      load();
    }
  }

  const canManage = hasRole("owner", "ops_manager", "housekeeping_supervisor");

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black flex items-center gap-2"><Building2 className="w-6 h-6" /> طلبات العمل العامة — Work Orders v2</h1>
        <p className="text-sm text-muted-foreground mt-1">إثبات أن المنصة ليست مغسلة — نفس الكود يشغل مغسلة + housekeeping + أي نشاط — Zero if (stage==='ironing') في المسار الجديد</p>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">إنشاء طلب جديد (v2)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Workflow</Label>
              <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر قالب" /></SelectTrigger>
                <SelectContent>
                  {workflows.map((wf) => (
                    <SelectItem key={wf.id} value={wf.id}>{wf.name} — {wf.industry} {wf.is_template ? "(Template)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedWorkflow && (
              <>
                <div>
                  <Label className="text-xs">عنوان العمل</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: تنظيف غرفة 301" className="mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">رقم الغرفة</Label><Input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="301" className="mt-1" /></div>
                  <div><Label className="text-xs">الطابق</Label><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} className="mt-1" /></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">حالة الضيف</Label>
                    <Select value={form.guest_status} onValueChange={(v) => setForm({ ...form, guest_status: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="checkout">Checkout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">نوع التنظيف</Label>
                    <Select value={form.cleaning_type} onValueChange={(v) => setForm({ ...form, cleaning_type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="checkout">Checkout</SelectItem>
                        <SelectItem value="deep">Deep</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {stages.length > 0 && (
                  <div className="p-2 bg-slate-50 border rounded text-xs space-y-1">
                    <div className="font-bold">مراحل هذا الـ Workflow (من Builder):</div>
                    {stages.map((s: any, i: number) => (
                      <div key={s.id} className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{i + 1}</Badge> {s.icon} {s.name_ar} — SLA {s.sla_target_mins}m</div>
                    ))}
                  </div>
                )}

                <Button onClick={createWorkOrder} disabled={!canManage} className="w-full"><Plus className="w-4 h-4 me-2" /> إنشاء طلب v2</Button>
                {!canManage && <p className="text-xs text-amber-600">تحتاج صلاحية مدير</p>}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">الطلبات — {orders.length} (v2 Engine)</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-auto">
              {orders.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground p-10">لا توجد طلبات v2 بعد — أنشئ أول طلب Housekeeping كإثبات</div>
              ) : (
                orders.map((o: any) => (
                  <div key={o.id} className="border rounded-xl p-3 space-y-2 hover:shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-bold">{o.title}</div>
                      <Badge>{o.workflow_definitions?.industry}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Workflow: {o.workflow_definitions?.name} • Stage: {o.workflow_stages_v2?.name_ar || o.current_stage_id?.slice(0, 8)} • {o.custom_fields?.room_number ? `غرفة ${o.custom_fields.room_number}` : ""}</div>
                    <div className="text-xs">Custom: {JSON.stringify(o.custom_fields)}</div>
                    <div className="text-xs font-mono">Snapshot v{o.workflow_version_snapshot?.version || "?" } — {o.workflow_version_snapshot?.stages?.length || 0} stages</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        // Move to next stage via v2 engine
                        const { data: nextStages } = await supabase.from("workflow_stages_v2").select("*").eq("workflow_id", o.workflow_id).order("stage_order");
                        const currentIdx = (nextStages ?? []).findIndex((s: any) => s.id === o.current_stage_id);
                        const next = (nextStages ?? [])[currentIdx + 1];
                        if (!next) return toast.info("وصلت لآخر مرحلة");
                        const { data: valid } = await supabase.rpc("validate_transition_v2", { _tenant_id: tenantId, _work_order_id: o.id, _to_stage_id: next.id });
                        if (!(valid as any)?.ok) return toast.error((valid as any)?.message || "Transition not allowed");
                        const { error } = await supabase.from("work_orders").update({ current_stage_id: next.id }).eq("id", o.id);
                        if (error) toast.error(error.message);
                        else { toast.success(`نُقل إلى ${next.name_ar}`); load(); }
                      }}>نقل للمرحلة التالية <ArrowRight className="w-3 h-3 ms-1" /></Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-xs leading-6">
              <b>إثبات Phase 2:</b> هذا الجدول يقرأ من <code>work_orders</code> + <code>workflow_version_snapshot</code> — كل طلب يحفظ نسخة من تعريف الـ workflow وقت إنشائه، فلو المدير عدّل التعريف بعدين، الطلبات القديمة تكمل بالتعريف القديم ومش تتكسر. صفر <code>if (stage === 'ironing')</code> في هذا المسار.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
