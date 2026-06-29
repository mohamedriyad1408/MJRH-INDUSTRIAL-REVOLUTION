import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { parseLatLng } from "@/lib/geo";
import { Loader2, Plus, Users, MapPin, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "العملاء" }] }),
  component: CustomersPage,
});

type C = { id?: string; full_name: string; phone: string; email?: string | null; address?: string | null; location_url?: string | null; lat?: number | null; lng?: number | null; notes?: string | null; created_at?: string };

function CustomersPage() {
  const { t, dir } = useI18n();
  const { tenantId } = useAuth();
  const [list, setList] = useState<C[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<C | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("customers").select("*").eq("tenant_id", tenantId).order("full_name");
    if (error) toast.error(error.message);
    setList((data ?? []) as C[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tenantId]);

  function extractLocation() {
    if (!editing?.location_url) return;
    const parsed = parseLatLng(editing.location_url);
    if (parsed) setEditing({ ...editing, lat: parsed.lat, lng: parsed.lng });
    else toast.error(t("customers.errGps", "لم أستطع استخراج الإحداثيات — الصق رابط Google Maps أو lat,lng"));
  }

  function detectGps() {
    if (!navigator.geolocation) return toast.error(t("customers.errGps", "المتصفح لا يدعم GPS"));
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setEditing((old: any) => ({ ...old, lat, lng, location_url: `https://maps.google.com/?q=${lat},${lng}` }));
      toast.success(t("customers.toastGpsOk", "تم تحديد موقع العميل"));
    }, () => toast.error(t("customers.toastGpsErr", "تعذر تحديد الموقع")), { enableHighAccuracy: true, timeout: 15000 });
  }

  async function save() {
    if (!editing?.full_name || !editing.phone) { toast.error(t("customers.errReq", "الاسم والتليفون مطلوبان")); return; }
    if ((editing.phone || "").replace(/\D/g, "").length < 11) { toast.error(t("customers.errPhoneLen", "رقم الهاتف يجب أن يكون 11 رقم على الأقل")); return; }
    setSaving(true);
    const payload = { tenant_id: tenantId, full_name: editing.full_name, phone: editing.phone, email: editing.email || null, address: editing.address || null, location_url: editing.location_url || null, lat: editing.lat ?? null, lng: editing.lng ?? null, notes: editing.notes || null };
    const { error } = editing.id ? await supabase.from("customers").update(payload).eq("id", editing.id) : await supabase.from("customers").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success(t("customers.toastSaved", "تم الحفظ")); setOpen(false); load(); }
  }

  const filtered = useMemo(() => list.filter((c) => !search || `${c.full_name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())), [list, search]);

  return (
    <div className="space-y-4 max-w-6xl" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("customers.pageTitle", "العملاء")}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {t("customers.subtitle", "عميل")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>{t("common.refresh")}</Button>
          <Button onClick={() => { setEditing({ full_name: "", phone: "" }); setOpen(true); }}><Plus className="w-4 h-4 ms-1" /> {t("customers.btnNew", "عميل جديد")}</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("customers.searchPlaceholder", "ابحث بالاسم أو التليفون...")} value={search} onChange={(e) => setSearch(e.target.value)} className="pe-9" />
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3">{t("customers.colName", "الاسم")}</th>
                  <th className="text-start p-3">{t("customers.colPhone", "التليفون")}</th>
                  <th className="text-start p-3">{t("customers.colAddress", "العنوان")}</th>
                  <th className="text-start p-3">{t("customers.colLocation", "الموقع")}</th>
                  <th className="text-start p-3">{t("customers.colSince", "منذ")}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t("customers.empty", "لا يوجد عملاء")}</td></tr>}
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-bold">{c.full_name}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3 text-xs text-muted-foreground">{c.address ?? "—"}</td>
                    <td className="p-3 text-xs">{c.lat && c.lng ? <span className="text-emerald-600 font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> {t("customers.locAccurate", "دقيق")}</span> : <span className="text-amber-600">{t("customers.locNone", "غير محدد")}</span>}</td>
                    <td className="p-3 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                    <td className="p-3 text-end">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(c); setOpen(true); }}>{t("common.edit", "تعديل")}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? t("customers.titleEdit", "تعديل عميل") : t("customers.titleNew", "عميل جديد")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div><Label>{t("customers.labelName", "الاسم *")}</Label><Input value={editing.full_name ?? ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></div>
              <div><Label>{t("customers.labelPhone", "التليفون *")}</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div><Label>{t("customers.labelEmail", "الإيميل")}</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label>{t("customers.labelAddress", "العنوان")}</Label><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              <div className="space-y-2 border p-3 rounded-xl bg-muted/20">
                <Label>{t("customers.labelLoc", "الموقع الدقيق")}</Label>
                <Input placeholder={t("customers.locPlaceholder", "رابط Google Maps أو lat,lng")} value={editing.location_url ?? ""} onChange={(e) => setEditing({ ...editing, location_url: e.target.value })} />
                <div className="flex gap-2 text-xs">
                  {editing.lat && editing.lng && <div className="text-emerald-600 font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> {editing.lat.toFixed(4)},{editing.lng.toFixed(4)}</div>}
                  <Button type="button" variant="outline" onClick={extractLocation}>{t("customers.btnExtract", "استخراج من الرابط")}</Button>
                </div>
              </div>
              <div><Label>{t("customers.labelNotes", "ملاحظات")}</Label><Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("customers.btnSave", "حفظ")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
