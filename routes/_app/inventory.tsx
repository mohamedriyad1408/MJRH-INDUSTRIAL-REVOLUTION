import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Boxes, Plus, AlertTriangle, Wrench, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({ meta: [{ title: "Inventory - MJRH" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { t, dir } = useI18n();
  const { hasRole, user, tenantId } = useAuth();
  const canUse = hasRole("owner", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [moves, setMoves] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");
  const [itemForm, setItemForm] = useState({ name: "", category: "consumable", unit: t("inventory.unit", "وحدة"), initial_qty: "0", reorder_level: "0", avg_unit_cost: "0", supplier: "", branch_id: "" });
  const [moveForm, setMoveForm] = useState({ item_id: "", movement_type: "purchase", qty: "1", unit_cost: "0", notes: "" });
  const [assetForm, setAssetForm] = useState({ name: "", asset_type: "machine", status: "working", next_maintenance_at: "", purchase_cost: "0", notes: "", branch_id: "" });

  async function load() {
    setLoading(true);
    try {
      const addBranch = (q: any) => branchId === "all" ? q : q.eq("branch_id", branchId);
      const [iRes, mRes, aRes, brRes] = await Promise.all([
        addBranch(supabase.from("inventory_items").select("*,branches(name)")).order("name"),
        addBranch(supabase.from("inventory_movements").select("*,branches(name),inventory_items(name,unit)")).order("created_at", { ascending: false }).limit(30),
        addBranch(supabase.from("equipment_assets").select("*,branches(name)")).order("created_at", { ascending: false }),
        tenantId ? supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at") : Promise.resolve({ data: [] }),
      ]);
      if (iRes.error) toast.error(iRes.error.message);
      if (mRes.error) toast.error(mRes.error.message);
      if (aRes.error) toast.error(aRes.error.message);
      if ((brRes as any).error) toast.error((brRes as any).error.message);
      const branchList = ((brRes as any).data ?? []) as any[];
      setBranches(branchList);
      setItemForm((old) => ({ ...old, branch_id: old.branch_id || (branchId !== "all" ? branchId : branchList[0]?.id || "") }));
      setAssetForm((old) => ({ ...old, branch_id: old.branch_id || (branchId !== "all" ? branchId : branchList[0]?.id || "") }));
      setItems(iRes.data ?? []); setMoves(mRes.data ?? []); setAssets(aRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (canUse) load(); }, [canUse, branchId, tenantId]);

  const stats = useMemo(() => {
    const low = items.filter((x) => Number(x.current_qty) <= Number(x.reorder_level));
    const value = items.reduce((s, x) => s + Number(x.current_qty ?? 0) * Number(x.avg_unit_cost ?? 0), 0);
    const down = assets.filter((x) => x.status !== "working");
    return { low, value, down };
  }, [items, assets]);

  async function addItem() {
    if (!itemForm.name.trim()) return toast.error(t("inventory.errName", "اكتب اسم الصنف"));
    const selectedBranchId = itemForm.branch_id || (branchId !== "all" ? branchId : branches[0]?.id);
    if (!selectedBranchId) return toast.error(t("inventory.errBranch", "اختار الفرع"));
    const { data, error } = await supabase.from("inventory_items").insert({
      name: itemForm.name.trim(), category: itemForm.category, unit: itemForm.unit || "وحدة", branch_id: selectedBranchId,
      reorder_level: Number(itemForm.reorder_level || 0), avg_unit_cost: Number(itemForm.avg_unit_cost || 0), supplier: itemForm.supplier || null,
    }).select("id").single();
    if (error) toast.error(error.message); else {
      const qty = Number(itemForm.initial_qty || 0);
      const cost = Number(itemForm.avg_unit_cost || 0);
      if (qty > 0) {
        await supabase.from("inventory_movements").insert({ item_id: data.id, branch_id: selectedBranchId, movement_type: "purchase", qty, unit_cost: cost, notes: t("inventory.movePurchase", "رصيد بداية/شراء أول"), created_by: user?.id });
      }
      await supabase.rpc("record_operation_event", { _process_key: "inventory_item_created", _process_name: "إضافة صنف مخزون", _source_type: "inventory_item", _source_id: data.id, _branch_id: selectedBranchId, _report_bucket: "inventory/reports", _requires_notification: Number(itemForm.initial_qty || 0) <= Number(itemForm.reorder_level || 0), _data: { tenant_id: tenantId, name: itemForm.name.trim(), qty, cost }, _output: { cash_impact: false, journal_required: qty > 0, appears_in_report: true } }).then(() => null);
      toast.success(t("inventory.toastAdded", "تم إضافة الصنف وربطه بالفرع والتقارير"));
      setItemForm({ name: "", category: "consumable", unit: t("inventory.unit", "وحدة"), initial_qty: "0", reorder_level: "0", avg_unit_cost: "0", supplier: "", branch_id: selectedBranchId });
      load();
    }
  }

  async function addMovement() {
    if (!moveForm.item_id) return toast.error(t("inventory.errItem", "اختار صنف"));
    const item = items.find((x) => x.id === moveForm.item_id);
    const selectedBranchId = item?.branch_id || (branchId !== "all" ? branchId : branches[0]?.id);
    if (!selectedBranchId) return toast.error(t("inventory.errMoveBranch", "تعذر تحديد فرع حركة المخزون"));
    const { data, error } = await supabase.from("inventory_movements").insert({
      item_id: moveForm.item_id, branch_id: selectedBranchId, movement_type: moveForm.movement_type, qty: Number(moveForm.qty || 0), unit_cost: Number(moveForm.unit_cost || 0), notes: moveForm.notes || null, created_by: user?.id,
    }).select("id").single();
    if (!error && data?.id) await supabase.rpc("record_operation_event", { _process_key: "inventory_movement", _process_name: "تسجيل حركة مخزون", _source_type: "inventory_movement", _source_id: data.id, _branch_id: selectedBranchId, _report_bucket: "inventory/reports", _requires_notification: ["usage", "waste"].includes(moveForm.movement_type), _data: { tenant_id: tenantId, item_id: moveForm.item_id, movement_type: moveForm.movement_type, qty: Number(moveForm.qty || 0) }, _output: { cash_impact: false, journal_required: ["purchase", "adjustment"].includes(moveForm.movement_type), appears_in_report: true } }).then(() => null);
    if (error) toast.error(error.message); else { toast.success(t("inventory.toastMoveAdded", "تم تسجيل حركة المخزون وربطها بالفرع")); setMoveForm({ item_id: "", movement_type: "purchase", qty: "1", unit_cost: "0", notes: "" }); load(); }
  }

  async function addAsset() {
    if (!assetForm.name.trim()) return toast.error(t("inventory.errAssetName", "اكتب اسم المعدة"));
    const selectedBranchId = assetForm.branch_id || (branchId !== "all" ? branchId : branches[0]?.id);
    if (!selectedBranchId) return toast.error(t("inventory.errBranch", "اختار الفرع"));
    const { error } = await supabase.from("equipment_assets").insert({
      name: assetForm.name.trim(), branch_id: selectedBranchId, asset_type: assetForm.asset_type, status: assetForm.status, next_maintenance_at: assetForm.next_maintenance_at || null, purchase_cost: Number(assetForm.purchase_cost || 0), notes: assetForm.notes || null,
    });
    if (error) toast.error(error.message); else { toast.success(t("inventory.toastAssetAdded", "تم إضافة المعدة وربطها بالفرع")); setAssetForm({ name: "", asset_type: "machine", status: "working", next_maintenance_at: "", purchase_cost: "0", notes: "", branch_id: selectedBranchId }); load(); }
  }

  async function updateAsset(id: string, status: string) {
    const { error } = await supabase.from("equipment_assets").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("inventory.toastAssetUpdated", "تم تحديث حالة المعدة")); load(); }
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("inventory.ownerOnly", "المخزون والمعدات للمالك ومدير التشغيل فقط.")}</CardContent></Card>;

  const curr = t("common.egp");

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><Boxes className="w-7 h-7 text-teal-600" />{t("inventory.pageTitle", "المخزون والمعدات")}</h1><p className="text-sm text-muted-foreground">{t("inventory.subtitle", "تحكم في الكيماويات، الأكياس، الاستهلاك، وصيانة المعدات.")}</p></div>
      <div className="flex gap-2"><Select value={branchId} onValueChange={setBranchId}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("inventory.allBranches", "كل الفروع")}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={load}>{t("common.refresh")}</Button></div>
    </div>

    <div className="grid md:grid-cols-3 gap-3">
      <Kpi title={t("inventory.value", "قيمة المخزون")} value={fmtMoney(stats.value, curr)} />
      <Kpi title={t("inventory.lowStock", "أصناف تحت حد الطلب")} value={stats.low.length} warn={stats.low.length > 0} />
      <Kpi title={t("inventory.equipmentDown", "معدات تحتاج تدخل")} value={stats.down.length} warn={stats.down.length > 0} />
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <Tabs defaultValue="stock" className="space-y-4">
      <TabsList><TabsTrigger value="stock">{t("inventory.tabStock", "المخزون")}</TabsTrigger><TabsTrigger value="moves">{t("inventory.tabMoves", "الحركات")}</TabsTrigger><TabsTrigger value="equipment">{t("inventory.tabEquipment", "المعدات")}</TabsTrigger></TabsList>

      <TabsContent value="stock" className="grid lg:grid-cols-[360px_1fr] gap-4">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" />{t("inventory.addItemTitle", "إضافة صنف")}</CardTitle></CardHeader><CardContent className="space-y-3">
          <Field label={t("inventory.labelBranch", "الفرع")}><Select value={itemForm.branch_id || (branchId !== "all" ? branchId : "")} onValueChange={(v) => setItemForm({ ...itemForm, branch_id: v })}><SelectTrigger><SelectValue placeholder={t("inventory.branchPlaceholder", "اختار الفرع")} /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={t("inventory.labelName", "اسم الصنف")}><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder={t("inventory.namePlaceholder", "مسحوق / أكياس / شماعات")} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label={t("inventory.labelUnit", "الوحدة")}><Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} /></Field><Field label={t("inventory.labelInitialQty", "الكمية التي اشتريتها")}><Input type="number" value={itemForm.initial_qty} onChange={(e) => setItemForm({ ...itemForm, initial_qty: e.target.value })} /></Field></div>
          <div className="grid grid-cols-2 gap-2"><Field label={t("inventory.labelReorder", "حد إعادة الطلب")}><Input type="number" value={itemForm.reorder_level} onChange={(e) => setItemForm({ ...itemForm, reorder_level: e.target.value })} /></Field><Field label={t("inventory.labelCost", "تكلفة الوحدة")}><Input type="number" value={itemForm.avg_unit_cost} onChange={(e) => setItemForm({ ...itemForm, avg_unit_cost: e.target.value })} /></Field></div>
          <Field label={t("inventory.labelSupplier", "المورد")}><Input value={itemForm.supplier} onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} /></Field>
          <div className="rounded-xl bg-teal-50 p-2 text-xs text-teal-800">{t("inventory.hintAdd", "مثال: اشتريت كيس مسحوق؟ اكتب الاسم والكمية والتكلفة، والسيستم سيضيف المخزون ويسجل قيد محاسبي وحركة خزنة تلقائيًا.")}</div>
          <Button onClick={addItem} className="w-full">{t("inventory.btnAdd", "إضافة وتسجيل")}</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("inventory.currentItems", "الأصناف الحالية")}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-3">
          {items.map((x) => <div key={x.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-2"><div className="font-black">{x.name}</div>{Number(x.current_qty) <= Number(x.reorder_level) && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 ms-1" />{t("inventory.badgeOrder", "اطلب")}</Badge>}</div><div className="text-sm text-muted-foreground mt-1">{x.current_qty} {x.unit} · {t("inventory.reorderLabel", "حد الطلب")} {x.reorder_level}</div><div className="text-[11px] text-teal-700">{x.branches?.name ?? t("inventory.noBranch", "بدون فرع")}</div><div className="text-xs mt-2">{t("inventory.itemValue", "القيمة:")} <b>{fmtMoney(Number(x.current_qty) * Number(x.avg_unit_cost), curr)}</b></div></div>)}
          {!items.length && <Empty text={t("inventory.empty", "لا توجد بيانات")} />}
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="moves" className="grid lg:grid-cols-[360px_1fr] gap-4">
        <Card><CardHeader><CardTitle className="text-base">{t("inventory.addMoveTitle", "تسجيل حركة")}</CardTitle></CardHeader><CardContent className="space-y-3">
          <Field label={t("inventory.labelItem", "الصنف")}><Select value={moveForm.item_id} onValueChange={(v) => setMoveForm({ ...moveForm, item_id: v })}><SelectTrigger><SelectValue placeholder={t("inventory.itemPlaceholder", "اختار")} /></SelectTrigger><SelectContent>{items.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}{x.branches?.name ? ` — ${x.branches.name}` : ""}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={t("inventory.labelMoveType", "نوع الحركة")}><Select value={moveForm.movement_type} onValueChange={(v) => setMoveForm({ ...moveForm, movement_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="purchase">{t("inventory.movePurchase", "شراء/توريد")}</SelectItem><SelectItem value="usage">{t("inventory.moveUsage", "استهلاك")}</SelectItem><SelectItem value="waste">{t("inventory.moveWaste", "هالك")}</SelectItem><SelectItem value="return">{t("inventory.moveReturn", "مرتجع للمخزن")}</SelectItem><SelectItem value="adjustment">{t("inventory.moveAdjustment", "تسوية")}</SelectItem></SelectContent></Select></Field>
          <div className="grid grid-cols-2 gap-2"><Field label={t("inventory.labelQty", "الكمية")}><Input type="number" value={moveForm.qty} onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })} /></Field><Field label={t("inventory.labelCost", "تكلفة الوحدة")}><Input type="number" value={moveForm.unit_cost} onChange={(e) => setMoveForm({ ...moveForm, unit_cost: e.target.value })} /></Field></div>
          <Textarea placeholder={t("inventory.labelNotes", "ملاحظات")} value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} />
          <Button onClick={addMovement} className="w-full">{t("inventory.btnSaveMove", "حفظ الحركة")}</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("inventory.latestMoves", "آخر الحركات")}</CardTitle></CardHeader><CardContent className="space-y-2">
          {moves.map((m) => <div key={m.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><div><div className="font-bold">{m.inventory_items?.name}</div><div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("ar-EG")} · {m.branches?.name ?? t("inventory.noBranch", "بدون فرع")}</div></div><Badge variant={["purchase","return","adjustment"].includes(m.movement_type) ? "secondary" : "destructive"}>{m.movement_type} · {m.qty}</Badge></div>)}
          {!moves.length && <Empty text={t("inventory.empty", "لا توجد بيانات")} />}
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="equipment" className="grid lg:grid-cols-[360px_1fr] gap-4">
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4" />{t("inventory.addAssetTitle", "إضافة معدة")}</CardTitle></CardHeader><CardContent className="space-y-3">
          <Field label={t("inventory.labelBranch", "الفرع")}><Select value={assetForm.branch_id || (branchId !== "all" ? branchId : "")} onValueChange={(v) => setAssetForm({ ...assetForm, branch_id: v })}><SelectTrigger><SelectValue placeholder={t("inventory.branchPlaceholder", "اختار الفرع")} /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label={t("inventory.labelName", "اسم المعدة")}><Input value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} placeholder={t("inventory.assetNamePlaceholder", "غسالة / مجفف / مكواة بخار")} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label={t("inventory.labelAssetType", "النوع")}><Input value={assetForm.asset_type} onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })} /></Field><Field label={t("inventory.labelAssetCost", "التكلفة")}><Input type="number" value={assetForm.purchase_cost} onChange={(e) => setAssetForm({ ...assetForm, purchase_cost: e.target.value })} /></Field></div>
          <Field label={t("inventory.labelNextMaintenance", "الصيانة القادمة")}><Input type="date" value={assetForm.next_maintenance_at} onChange={(e) => setAssetForm({ ...assetForm, next_maintenance_at: e.target.value })} /></Field>
          <Textarea placeholder={t("inventory.labelNotes", "ملاحظات")} value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
          <Button onClick={addAsset} className="w-full">{t("inventory.btnAddAsset", "إضافة المعدة")}</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("inventory.assetsTitle", "المعدات")}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-3">
          {assets.map((a) => <div key={a.id} className="rounded-2xl border p-3 space-y-2"><div className="flex justify-between gap-2"><div className="font-black">{a.name}</div><Badge variant={a.status === "working" ? "secondary" : "destructive"}>{statusAr(a.status, t)}</Badge></div><div className="text-xs text-muted-foreground">{t("inventory.nextMaintenance", "الصيانة القادمة:")} {a.next_maintenance_at ?? "—"}</div><Select value={a.status} onValueChange={(v) => updateAsset(a.id, v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="working">{t("inventory.statusWorking", "تعمل")}</SelectItem><SelectItem value="needs_service">{t("inventory.statusNeedsService", "تحتاج صيانة")}</SelectItem><SelectItem value="out_of_service">{t("inventory.statusOutOfService", "خارج الخدمة")}</SelectItem><SelectItem value="retired">{t("inventory.statusRetired", "مكهّنة")}</SelectItem></SelectContent></Select></div>)}
          {!assets.length && <Empty text={t("inventory.empty", "لا توجد بيانات")} />}
        </CardContent></Card>
      </TabsContent>
    </Tabs>}
  </div>;
}

function Kpi({ title, value, warn = false }: { title: string; value: any; warn?: boolean }) {
  return <Card className={warn ? "border-amber-200 bg-amber-50" : "border-teal-100 bg-white"}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{title}</div><div className="text-2xl font-black mt-1 flex items-center gap-2">{warn ? <TrendingDown className="w-5 h-5 text-amber-600" /> : <TrendingUp className="w-5 h-5 text-teal-600" />}{value}</div></CardContent></Card>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }
function Empty({ text }: { text: string }) { return <div className="col-span-full p-8 text-center text-muted-foreground">{text}</div>; }
function statusAr(s: string, t: any) { return ({ working: t("inv.status.working", "تعمل"), needs_service: t("inv.status.needs_service", "تحتاج صيانة"), out_of_service: t("inv.status.out_of_service", "خارج الخدمة"), retired: t("inv.status.retired", "مكهّنة") } as any)[s] ?? s; }
