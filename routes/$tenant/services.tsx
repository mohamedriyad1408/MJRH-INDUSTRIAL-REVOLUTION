import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Save, Tags, Search, ArrowUpDown, Filter,
  LayoutGrid, List, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Shirt,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PosCategoryTabs, type ServiceTypeFilter } from "@/components/pos-category-tabs";
import { DRY_TECH_CATALOG_SEED, POS_CATEGORY_TABS } from "@/lib/dry-tech-catalog";

export const Route = createFileRoute("/$tenant/services")({
  head: () => ({ meta: [{ title: "كتالوج الخدمات والأصناف" }] }),
  component: ServicesPage,
});

type Item = {
  id?: string;
  name: string;
  service_type: string;
  unit_price: number;
  is_active: boolean;
  category?: string;
};

function ServicesPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const canEdit = hasRole("owner", "ops_manager");
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Advanced Filtering, Sorting & Display Controls
  const [categoryTab, setCategoryTab] = useState<string>("all");
  const [serviceType, setServiceType] = useState<ServiceTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "price-desc" | "price-asc" | "type">("name-asc");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const curr = t("common.egp", "ج.م");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("service_items").select("*").order("name");
    if (error) toast.error(error.message);
    setList((data ?? []) as Item[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function newItem() {
    // Default to the currently active tab if not "all"
    const defaultCat = categoryTab !== "all" ? categoryTab : "رجالي";
    setEditing({
      name: "",
      service_type: defaultCat === "سجاد وموكيت" ? "both" : "both",
      unit_price: 50,
      is_active: true,
      category: defaultCat,
    });
    setOpen(true);
  }

  async function save() {
    if (!editing?.name || !tenantId) return;
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      name: editing.name.trim(),
      service_type: editing.service_type as any,
      unit_price: Number(editing.unit_price),
      category: editing.category || "رجالي",
      is_active: editing.is_active,
    };
    const { error } = editing.id
      ? await supabase.from("service_items").update(payload).eq("id", editing.id)
      : await supabase.from("service_items").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("services.toastSaved", "تم الحفظ بنجاح"));
      setOpen(false);
      load();
    }
  }

  async function deleteItem(id: string) {
    if (!confirm(t("services.confirmDelete", "هل أنت متأكد من حذف هذه الخدمة؟"))) return;
    const { error } = await supabase.from("service_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("services.toastDeleted", "تم الحذف بنجاح"));
      load();
    }
  }

  async function toggleActive(item: Item) {
    if (!item.id || !canEdit) return;
    const nextStatus = !item.is_active;
    const { error } = await supabase.from("service_items").update({ is_active: nextStatus }).eq("id", item.id);
    if (error) {
      toast.error(error.message);
    } else {
      setList((old) => old.map((i) => (i.id === item.id ? { ...i, is_active: nextStatus } : i)));
      toast.success(nextStatus ? "تم تفعيل الصنف" : "تم إيقاف الصنف");
    }
  }

  async function syncMissingCatalogItems() {
    if (!tenantId) return;
    setSyncing(true);
    try {
      const existingNames = new Set(list.map((i) => i.name.trim().toLowerCase()));
      const missing = DRY_TECH_CATALOG_SEED.filter((seed) => !existingNames.has(seed.name.trim().toLowerCase()));
      if (missing.length === 0) {
        toast.success("الكتالوج مكتمل ومطابق لمعايير Dry Tech 100%!");
        setSyncing(false);
        return;
      }
      const rows = missing.map((item) => ({
        tenant_id: tenantId,
        name: item.name,
        service_type: item.service_type as any,
        unit_price: item.unit_price,
        category: item.category,
        is_active: true,
      }));
      const { error } = await supabase.from("service_items").insert(rows);
      if (error) throw error;
      toast.success(`تمت إضافة ${rows.length} صنف ناقص بنجاح من كتالوج Dry Tech!`);
      load();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء المزامنة");
    } finally {
      setSyncing(false);
    }
  }

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    let res = list.filter((item) => {
      const byCat = categoryTab === "all" || item.category === categoryTab || (categoryTab === "رجالي" && !item.category);
      const byType = !serviceType || serviceType === "all" || item.service_type === serviceType;
      const byStatus = statusFilter === "all" ? true : statusFilter === "active" ? item.is_active : !item.is_active;
      const bySearch = !q || item.name.toLowerCase().includes(q);
      return byCat && byType && byStatus && bySearch;
    });

    res.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, "ar");
      if (sortBy === "name-desc") return b.name.localeCompare(a.name, "ar");
      if (sortBy === "price-desc") return (b.unit_price || 0) - (a.unit_price || 0);
      if (sortBy === "price-asc") return (a.unit_price || 0) - (b.unit_price || 0);
      if (sortBy === "type") return (a.service_type || "").localeCompare(b.service_type || "");
      return 0;
    });
    return res;
  }, [list, categoryTab, serviceType, statusFilter, search, sortBy]);

  function typeLabel(s: string) {
    return ({
      cleaning: "تصليحات ورَفْو",
      ironing: "كي فقط بالبخار",
      both: "تنظيف وغسيل (Dry Clean)",
    } as Record<string, string>)[s] ?? s;
  }

  function categoryBadgeLabel(cat?: string) {
    const found = POS_CATEGORY_TABS.find((t) => t.id === cat);
    return found ? found.label : cat || "رجالي";
  }

  const stats = useMemo(() => {
    const total = filteredList.length;
    const active = filteredList.filter((s) => s.is_active).length;
    const avgPrice = total > 0 ? filteredList.reduce((acc, s) => acc + (s.unit_price || 0), 0) / total : 0;
    const bothCount = filteredList.filter((s) => s.service_type === "both").length;
    const ironingCount = filteredList.filter((s) => s.service_type === "ironing").length;
    return { total, active, avgPrice, bothCount, ironingCount };
  }, [filteredList]);

  return (
    <div className="space-y-6 pb-12" dir={dir}>
      {/* Top Title & Sync Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Tags className="w-6 h-6 text-teal-400 shrink-0" />
            <h1 className="text-2xl font-black">{t("services.pageTitle", "كتالوج الخدمات والأصناف المعتمد")}</h1>
          </div>
          <p className="text-sm text-slate-300">
            إدارة وتصنيف وترتيب الأصناف الفعالة تحت المبوبات التشغيلية القياسية، مع ميزات التحكم الفوري في الأسعار والحالة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={syncMissingCatalogItems}
                disabled={syncing}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-bold"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1 text-teal-300" />}
                <span>مزامنة النواقص من الكتالوج الرسمي</span>
              </Button>
              <Button
                onClick={newItem}
                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-black shadow-lg shadow-teal-500/20"
              >
                <Plus className="w-4 h-4 ms-1" />
                <span>إضافة صنف جديد</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white/90 border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500">الأصناف في الفئة الحالية</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black">
              <Tags className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500">الأصناف الفعالة (نشطة)</div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{stats.active}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500">متوسط سعر الوحدة</div>
              <div className="text-xl font-black text-indigo-600 mt-0.5">{fmtMoney(stats.avgPrice, curr)}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500">توزيع نوع الخدمة</div>
              <div className="text-xs font-bold text-slate-700 mt-1 flex gap-2">
                <span className="text-blue-600">غسيل: {stats.bothCount}</span> | <span className="text-purple-600">كي: {stats.ironingCount}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <Shirt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* POS Category Tabs & Service Type Filter */}
      <PosCategoryTabs
        activeTab={categoryTab}
        onSelect={setCategoryTab}
        items={list}
        compact={false}
        activeServiceType={serviceType}
        onSelectServiceType={setServiceType}
      />

      {/* Control Bar: Search, Sort, Status Filter, View Toggle */}
      <Card className="bg-white/95 border-0 shadow-md">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="ابحث باسم الصنف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pe-9 h-10 rounded-xl bg-slate-50 border-slate-200 font-bold text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>الترتيب:</span>
              </span>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-10 w-44 rounded-xl bg-slate-50 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc" className="text-xs font-bold">الاسم (أ - ي)</SelectItem>
                  <SelectItem value="name-desc" className="text-xs font-bold">الاسم (ي - أ)</SelectItem>
                  <SelectItem value="price-desc" className="text-xs font-bold">السعر (الأعلى أولاً)</SelectItem>
                  <SelectItem value="price-asc" className="text-xs font-bold">السعر (الأقل أولاً)</SelectItem>
                  <SelectItem value="type" className="text-xs font-bold">حسب نوع الخدمة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>الحالة:</span>
              </span>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="h-10 w-36 rounded-xl bg-slate-50 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold">كل الحالات</SelectItem>
                  <SelectItem value="active" className="text-xs font-bold text-emerald-600">النشطة فقط</SelectItem>
                  <SelectItem value="inactive" className="text-xs font-bold text-slate-400">الموقوفة فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewMode === "grid" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>شبكة كروت</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewMode === "table" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول تفصيلي</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Display Area */}
      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : filteredList.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-slate-200">
          <CardContent className="space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-lg font-bold text-slate-600">لا توجد أصناف تطابق معايير الفلترة والبحث</div>
            <p className="text-xs text-slate-400">جرب تغيير المبوب أو كلمة البحث لعرض البنود المسجلة.</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredList.map((s) => (
            <div
              key={s.id}
              className={`group rounded-3xl border transition-all duration-200 p-4 flex flex-col justify-between shadow-sm hover:shadow-xl ${
                s.is_active
                  ? "bg-gradient-to-br from-white via-white to-slate-50/80 border-slate-200/80 hover:border-teal-400"
                  : "bg-slate-100/60 border-slate-200 opacity-60 hover:opacity-90"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-600 border-slate-200">
                    {categoryBadgeLabel(s.category)}
                  </Badge>
                  <Badge
                    className={`text-[10px] font-black ${
                      s.service_type === "both"
                        ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                        : s.service_type === "ironing"
                        ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    {s.service_type === "both" ? "تنظيف + كي" : s.service_type === "ironing" ? "كي بالبخار" : "تصليح"}
                  </Badge>
                </div>

                <div className="font-black text-base text-slate-900 leading-snug group-hover:text-teal-700 transition">
                  {s.name}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-400">سعر الوحدة</div>
                  <div className="text-lg font-black text-teal-700 leading-none">{fmtMoney(s.unit_price, curr)}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  {canEdit && (
                    <>
                      <div className="flex items-center" title="تفعيل / إيقاف الصنف">
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={() => toggleActive(s)}
                          className="scale-75 data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs font-bold rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      >
                        {t("common.edit", "تعديل")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => s.id && deleteItem(s.id)}
                        className="h-8 w-8 p-0 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 border-slate-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card className="border-0 shadow-md overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="text-start p-3.5">المبوبة / الفئة</th>
                  <th className="text-start p-3.5">اسم الصنف</th>
                  <th className="text-start p-3.5">التصنيف (نوع الخدمة)</th>
                  <th className="text-start p-3.5">سعر الوحدة</th>
                  <th className="text-start p-3.5">الحالة التشغيلية</th>
                  <th className="p-3.5 text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5 font-bold text-slate-600">
                      <Badge variant="outline" className="font-bold bg-slate-50">
                        {categoryBadgeLabel(s.category)}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-black text-slate-900">{s.name}</td>
                    <td className="p-3.5">
                      <Badge
                        className={`text-xs font-bold ${
                          s.service_type === "both"
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                            : s.service_type === "ironing"
                            ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        }`}
                      >
                        {typeLabel(s.service_type)}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-black text-teal-700 text-base">{fmtMoney(s.unit_price, curr)}</td>
                    <td className="p-3.5">
                      {s.is_active ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 font-bold">نشط وفعال</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-300 font-bold">موقوف تشغيلياً</Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-end">
                      {canEdit && (
                        <div className="flex gap-1.5 justify-end items-center">
                          <Switch
                            checked={s.is_active}
                            onCheckedChange={() => toggleActive(s)}
                            className="scale-75 data-[state=checked]:bg-emerald-600 me-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(s);
                              setOpen(true);
                            }}
                            className="h-8 px-3 font-bold rounded-xl"
                          >
                            {t("common.edit", "تعديل")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => s.id && deleteItem(s.id)}
                            className="h-8 w-8 p-0 rounded-xl text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editing?.id ? t("services.titleEdit", "تعديل بيانات الصنف") : t("services.titleNew", "إضافة صنف جديد للكتالوج")}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">{t("services.labelName", "اسم الصنف")}</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="مثال: بدلة رجالي قطعتين دراي كلين..."
                  className="h-10 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">المبوبة / الفئة (Category)</Label>
                  <Select
                    value={editing.category || "رجالي"}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl font-bold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="رجالي" className="text-xs font-bold">رجالي</SelectItem>
                      <SelectItem value="حريمي" className="text-xs font-bold">حريمي</SelectItem>
                      <SelectItem value="أطفال" className="text-xs font-bold">أطفال</SelectItem>
                      <SelectItem value="تنظيف المفروشات" className="text-xs font-bold">مفروشات</SelectItem>
                      <SelectItem value="سجاد وموكيت" className="text-xs font-bold">سجاد</SelectItem>
                      <SelectItem value="توصيل وخدمات" className="text-xs font-bold">توصيل وخدمات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">{t("services.labelType", "التصنيف (نوع الخدمة)")}</Label>
                  <Select
                    value={editing.service_type}
                    onValueChange={(v) => setEditing({ ...editing, service_type: v as any })}
                  >
                    <SelectTrigger className="h-10 rounded-xl font-bold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both" className="text-xs font-bold">تنظيف وغسيل (Dry Clean)</SelectItem>
                      <SelectItem value="ironing" className="text-xs font-bold">كي فقط بالبخار (Steam Iron)</SelectItem>
                      <SelectItem value="cleaning" className="text-xs font-bold">تصليحات ورَفْو (Alterations)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">{t("services.labelPrice", "سعر الوحدة (بالجنيه المصري)")}</Label>
                <Input
                  type="number"
                  value={editing.unit_price}
                  onChange={(e) => setEditing({ ...editing, unit_price: Number(e.target.value) })}
                  className="h-10 rounded-xl font-black text-base text-teal-700"
                />
              </div>

              <div className="flex items-center justify-between border rounded-2xl p-3.5 bg-slate-50">
                <div>
                  <Label className="font-bold text-slate-800">تفعيل الصنف تشغيلياً</Label>
                  <div className="text-[11px] text-slate-500">يظهر فوراً في شاشات استلام الطلبات والكاشير</div>
                </div>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={save}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl h-10 w-full"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Save className="w-4 h-4 ms-1" />}
              <span>{t("services.btnSave", "حفظ وتوثيق الصنف")}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
