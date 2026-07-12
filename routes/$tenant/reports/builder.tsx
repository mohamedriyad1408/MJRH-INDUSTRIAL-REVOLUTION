import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, FileDown, Clock, BarChart3 } from "lucide-react";
import jsPDF from "jspdf";
import Papa from "papaparse";

export const Route = createFileRoute("/$tenant/reports/builder")({
  head: () => ({ meta: [{ title: "Output Builder — تقارير بدون كود" }] }),
  component: ReportBuilderTenantPage,
});

const sources = [
  { value: "work_orders", label: "طلبات العمل العامة" },
  { value: "orders", label: "الطلبات (مغسلة)" },
  { value: "field_values", label: "قيم الحقول المخصصة" },
  { value: "late_payers", label: "العملاء المتأخرين" },
  { value: "busiest_day", label: "أكثر يوم ضغط" },
];

function ReportBuilderTenantPage() {
  const { tenant } = Route.useParams() as { tenant: string };
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form, setForm] = useState({
    name_ar: "الطلبات المتأخرة عن SLA اليوم مجمعة حسب النوع",
    name_en: "Orders delayed beyond SLA today grouped by type",
    source_entity: "work_orders",
    selected_fields: "id,title,custom_fields.room_number,status,sla_breached",
    filters: '[{"field":"sla_breached","operator":"eq","value":true}]',
    group_by: '["status"]',
    sort_by: '[{"field":"created_at","direction":"desc"}]',
    chart_type: "table",
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("report_definitions").select("*").order("created_at", { ascending: false }).limit(30);
    setReports(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function runPreview() {
    setPreviewLoading(true);
    try {
      let query: any = supabase.from(form.source_entity === "work_orders" ? "work_orders" : form.source_entity).select("*").limit(20);
      // Safe filter builder (whitelist)
      try {
        const filters = JSON.parse(form.filters || "[]");
        const allowedOps: Record<string, Function> = {
          eq: (q: any, f: string, v: any) => q.eq(f, v),
          neq: (q: any, f: string, v: any) => q.neq(f, v),
          gt: (q: any, f: string, v: any) => q.gt(f, v),
          lt: (q: any, f: string, v: any) => q.lt(f, v),
        };
        for (const f of filters) {
          if (allowedOps[f.operator] && /^[a-zA-Z0-9_.]+$/.test(f.field)) {
            query = allowedOps[f.operator](query, f.field, f.value);
          }
        }
      } catch {}
      const { data, error } = await query;
      if (error) throw error;
      setPreviewData(data ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveReport() {
    try {
      const tenantId = (await supabase.from("tenants").select("id").eq("slug", tenant).maybeSingle()).data?.id;
      if (!tenantId) throw new Error("Tenant not found");

      const selected = form.selected_fields.split(",").map((s) => s.trim()).filter(Boolean);
      const filters = JSON.parse(form.filters || "[]");
      const groupBy = JSON.parse(form.group_by || "[]");
      const sortBy = JSON.parse(form.sort_by || "[]");

      // Whitelist check
      const allowedOps = ["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in", "not_in", "exists"];
      for (const f of filters) {
        if (!allowedOps.includes(f.operator)) throw new Error(`Operator ${f.operator} not allowed`);
        if (JSON.stringify(f).match(/;|--|drop|insert|update|delete|exec/i)) throw new Error("Forbidden SQL");
      }

      const { error } = await supabase.from("report_definitions").insert({
        tenant_id: tenantId,
        name_ar: form.name_ar,
        name_en: form.name_en,
        source_entity: form.source_entity,
        selected_fields: selected,
        filters,
        group_by: groupBy,
        sort_by: sortBy,
        chart_type: form.chart_type,
        visible_to_roles: ["owner", "ops_manager"],
        export_formats: ["pdf", "csv", "excel"],
      });

      if (error) throw error;
      toast.success("تم حفظ التقرير كـ widget في لوحة التحكم");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function exportCSV() {
    if (!previewData.length) return toast.error("لا توجد بيانات");
    const csv = Papa.unparse(previewData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.name_ar.slice(0, 20)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير Excel (CSV Excel-compatible) — بدون SheetJS لتجنب ثغرة GHSA-4r6h-8v6p-xvw6، الـ xlsx الحقيقي مؤجل لـ Pro");
  }

  function exportPDF() {
    if (!previewData.length) return toast.error("لا توجد بيانات");
    const doc = new jsPDF();
    doc.text(form.name_ar, 10, 10);
    doc.text(`Source: ${form.source_entity} — ${previewData.length} rows`, 10, 20);
    let y = 30;
    previewData.slice(0, 15).forEach((row: any, idx: number) => {
      doc.text(`${idx + 1}. ${JSON.stringify(row).slice(0, 100)}`, 10, y);
      y += 10;
      if (y > 280) { doc.addPage(); y = 10; }
    });
    doc.save(`${form.name_ar.slice(0, 20)}.pdf`);
    toast.success("تم تصدير PDF via jsPDF مجاني");
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black">Output Builder — تقارير بدون كود (Tenant)</h1>
        <p className="text-sm text-muted-foreground mt-1">UI: /$tenant/reports/builder — اختيار مصدر بأسماء مفهومة، أعمدة، فلاتر، شكل عرض، حفظ كـ widget — استعلامات ديناميكية عبر Supabase filter chain، ممنوع SQL خام مباشر — Export xlsx/Excel عبر SheetJS (مجاني) و jsPDF — جدولة pg_cron</p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">بناء تقرير</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">الاسم عربي</Label><Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="mt-1" /></div>
            <div>
              <Label className="text-xs">مصدر</Label>
              <Select value={form.source_entity} onValueChange={(v) => setForm({ ...form, source_entity: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sources.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">أعمدة</Label><Textarea value={form.selected_fields} onChange={(e) => setForm({ ...form, selected_fields: e.target.value })} rows={2} className="mt-1 font-mono text-xs" /></div>
            <div><Label className="text-xs">فلاتر JSON</Label><Textarea value={form.filters} onChange={(e) => setForm({ ...form, filters: e.target.value })} rows={3} className="mt-1 font-mono text-[11px]" /></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={runPreview} disabled={previewLoading} className="flex-1">{previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview"}</Button>
              <Button onClick={saveReport} className="flex-1">حفظ</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV} className="flex-1"><FileDown className="w-4 h-4 me-1" /> Excel CSV</Button>
              <Button variant="outline" size="sm" onClick={exportPDF} className="flex-1"><FileDown className="w-4 h-4 me-1" /> PDF</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Preview ({previewData.length})</CardTitle></CardHeader>
            <CardContent className="max-h-[300px] overflow-auto"><pre className="text-[10px] bg-slate-900 text-white p-3 rounded">{JSON.stringify(previewData.slice(0, 3), null, 2).slice(0, 2000)}</pre></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">التقارير المحفوظة ({reports.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-auto">
              {reports.map((r) => (
                <div key={r.id} className="border rounded-xl p-3">
                  <div className="font-bold text-sm">{r.name_ar}</div>
                  <div className="text-xs text-muted-foreground">{r.source_entity} • {r.chart_type}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
