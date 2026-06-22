import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { parseLatLng } from "@/lib/geo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Search, Pencil, Upload, LocateFixed, MapPin } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "العملاء" }] }),
  component: CustomersPage,
});

type Customer = { id: string; full_name: string; phone: string; email: string | null; address: string | null; notes: string | null; created_at: string; lat?: number | null; lng?: number | null; location_url?: string | null; area?: string | null };

function CustomersPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "cs_manager");
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(500);
    setList((data ?? []) as Customer[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = list.filter((c) => !search || c.full_name.includes(search) || c.phone.includes(search));

  function extractLocation() {
    if (!editing) return;
    const parsed = parseLatLng(editing.location_url || editing.address || "");
    if (parsed) setEditing({ ...editing, lat: parsed.lat, lng: parsed.lng, location_url: editing.location_url || `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}` });
    else toast.error("لم أستطع استخراج الإحداثيات — الصق رابط Google Maps أو lat,lng");
  }

  function useGps() {
    if (!editing) return;
    if (!navigator.geolocation) return toast.error("المتصفح لا يدعم GPS");
    navigator.geolocation.getCurrentPosition((p) => {
      const lat = Number(p.coords.latitude.toFixed(7));
      const lng = Number(p.coords.longitude.toFixed(7));
      setEditing({ ...editing, lat, lng, location_url: `https://www.google.com/maps?q=${lat},${lng}` });
      toast.success("تم تحديد موقع العميل");
    }, () => toast.error("تعذر تحديد الموقع"), { enableHighAccuracy: true, timeout: 15000 });
  }

  async function save() {
    if (!editing?.full_name || !editing.phone) { toast.error("الاسم والتليفون مطلوبان"); return; }
    const payload = { full_name: editing.full_name, phone: editing.phone, email: editing.email || null, address: editing.address || null, notes: editing.notes || null, lat: editing.lat ?? null, lng: editing.lng ?? null, location_url: editing.location_url || null, area: editing.area || null };
    const { error } = editing.id
      ? await (supabase as any).from("customers").update(payload).eq("id", editing.id)
      : await (supabase as any).from("customers").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ"); setOpen(false); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">العملاء</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} عميل</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <ImportExcelButton onDone={load} />
            <Button onClick={() => { setEditing({ full_name: "", phone: "" }); setOpen(true); }}><Plus className="w-4 h-4 ms-1" /> عميل جديد</Button>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="ابحث بالاسم أو التليفون..." value={search} onChange={(e) => setSearch(e.target.value)} className="pe-9" />
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3">الاسم</th>
                  <th className="text-start p-3">التليفون</th>
                  <th className="text-start p-3">العنوان</th>
                  <th className="text-start p-3">الموقع</th>
                  <th className="text-start p-3">منذ</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا يوجد عملاء</td></tr>}
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.full_name}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{c.address ?? "—"}</td>
                    <td className="p-3 text-xs">{c.lat && c.lng ? <span className="text-emerald-600 font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> دقيق</span> : <span className="text-amber-600">غير محدد</span>}</td>
                    <td className="p-3 text-xs">{fmtDate(c.created_at)}</td>
                    <td className="p-3 text-end">
                      {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "تعديل عميل" : "عميل جديد"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>الاسم *</Label><Input value={editing.full_name ?? ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></div>
              <div><Label>التليفون *</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div><Label>الإيميل</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label>العنوان</Label><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              <div className="space-y-2 rounded-xl border p-3">
                <Label>الموقع الدقيق</Label>
                <Input placeholder="رابط Google Maps أو lat,lng" value={editing.location_url ?? ""} onChange={(e) => setEditing({ ...editing, location_url: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Latitude" value={editing.lat ?? ""} onChange={(e) => setEditing({ ...editing, lat: Number(e.target.value) || null })} />
                  <Input placeholder="Longitude" value={editing.lng ?? ""} onChange={(e) => setEditing({ ...editing, lng: Number(e.target.value) || null })} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={extractLocation}>استخراج من الرابط</Button>
                  <Button type="button" variant="secondary" onClick={useGps}><LocateFixed className="w-4 h-4 ms-1" /> GPS</Button>
                </div>
              </div>
              <div><Label>ملاحظات</Label><Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImportExcelButton({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  async function handle(file: File) {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // Columns RTL: الاسم | الهاتف | العنوان — XLSX reads them as visual order regardless
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
      const records: { full_name: string; phone: string; address: string | null }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] ?? [];
        const [a, b, c] = r;
        if (!a || !b) continue;
        // Skip header
        if (i === 0 && (String(a).includes("اسم") || String(b).includes("هات"))) continue;
        records.push({ full_name: String(a).trim(), phone: String(b).trim(), address: c ? String(c).trim() : null });
      }
      if (!records.length) { toast.error("الملف فارغ أو غير صالح"); return; }
      const { error } = await supabase.from("customers").insert(records);
      if (error) toast.error(error.message);
      else { toast.success(`تم استيراد ${records.length} عميل`); onDone(); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل القراءة");
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
      <Button variant="outline" onClick={() => ref.current?.click()} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Upload className="w-4 h-4 ms-1" />} استيراد Excel
      </Button>
    </>
  );
}
