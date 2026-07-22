import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/lib/inventory-api";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Edit, UserPlus, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createLazyFileRoute("/_app/staff/suppliers")({
  component: SuppliersPage,
});

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: "active" | "inactive";
}

function SuppliersPage() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Supplier>>({ name: "", phone: "", email: "", contact_person: "" });

  const loadSuppliers = async () => {
    if (!tenantId) return;
    setLoading(true);
    const data = await getSuppliers(tenantId);
    setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSuppliers();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast.error(t("suppliers.errName", "اكتب اسم المورد"));
    setSaving(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, form);
        toast.success(t("suppliers.toastUpdated", "تم تحديث بيانات المورد"));
      } else {
        await createSupplier(tenantId!, form);
        toast.success(t("suppliers.toastAdded", "تم إضافة مورد جديد"));
      }
      setForm({ name: "", phone: "", email: "", contact_person: "" });
      setEditing(null);
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await deleteSupplier(id);
    toast.success(t("common.toastDeleted"));
    loadSuppliers();
  };

  if (loading) return (
    <div className="p-12 text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" />
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir={dir}>
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <UserPlus className="w-7 h-7 text-teal-600" /> {t("suppliers.pageTitle", "إدارة الموردين")}
        </h1>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <Card className="rounded-3xl shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-base font-black flex items-center gap-2">
              {editing ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editing ? t("suppliers.editTitle", "تعديل مورد") : t("suppliers.addTitle", "إضافة مورد")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t("common.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t("suppliers.contactPerson", "الشخص المسؤول")}</Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t("common.phone")}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t("common.email")}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl font-mono" />
              </div>
              <div className="pt-2 flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 font-bold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? t("common.save") : t("common.add")}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ name: "", phone: "", email: "" }); }} className="rounded-xl">
                    {t("common.cancel")}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {suppliers.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-slate-50 rounded-3xl border border-dashed text-slate-400 font-medium">
              {t("common.noData")}
            </div>
          ) : (
            suppliers.map((s) => (
              <Card key={s.id} className="rounded-3xl border-slate-100 hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-black text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500 font-bold">{s.contact_person || "—"}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-teal-600 hover:bg-teal-50 rounded-full" onClick={() => { setEditing(s); setForm(s); }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400" /> <span className="font-mono">{s.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail className="w-3 h-3 text-slate-400" /> <span className="font-mono">{s.email || "—"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
