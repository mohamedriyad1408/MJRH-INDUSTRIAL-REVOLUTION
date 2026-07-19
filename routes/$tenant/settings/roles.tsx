import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Shield, Edit } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/settings/roles")({
  head: () => ({ meta: [{ title: "إدارة الأدوار والصلاحيات" }] }),
  component: RolesPage,
});

type Role = {
  id: string;
  name: string;
  name_en?: string;
  slug: string;
  description?: string;
  permissions: any;
  is_system: boolean;
  is_active: boolean;
};

function RolesPage() {
  const { t, dir } = useI18n();
  const { tenantId, hasRole } = useAuth();
  const canEdit = hasRole("owner");
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Role> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const PERMISSION_KEYS = [
    { key: "all", label: t("roles.permissionLabels.all"), labelEn: "All permissions" },
    { key: "can_manage_orders", label: t("roles.permissionLabels.can_manage_orders"), labelEn: "Manage operations" },
    { key: "can_manage_stations", label: t("roles.permissionLabels.can_manage_stations"), labelEn: "Manage stations" },
    { key: "can_view_reports", label: t("roles.permissionLabels.can_view_reports"), labelEn: "View reports" },
    { key: "can_manage_staff", label: t("roles.permissionLabels.can_manage_staff"), labelEn: "Manage staff" },
    { key: "can_manage_customers", label: t("roles.permissionLabels.can_manage_customers"), labelEn: "Manage customers" },
    { key: "can_manage_inventory", label: t("roles.permissionLabels.can_manage_inventory"), labelEn: "Manage inventory" },
    { key: "can_manage_finance", label: t("roles.permissionLabels.can_manage_finance"), labelEn: "Manage finance" },
    { key: "can_view_driver", label: t("roles.permissionLabels.can_view_driver"), labelEn: "View driver" },
  ];

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase.from("custom_roles").select("*").eq("tenant_id", tenantId).order("is_system", { ascending: false }).order("name");
    if (error) toast.error(error.message);
    else setRoles((data ?? []) as Role[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [tenantId]);

  async function save() {
    if (!tenantId || !editing?.name || !editing?.slug) return toast.error(t("roles.errorRequired"));
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      name: editing.name,
      name_en: editing.name_en || editing.name,
      slug: editing.slug,
      description: editing.description || "",
      permissions: editing.permissions || {},
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("custom_roles").update(payload).eq("id", editing.id)
      : await supabase.from("custom_roles").insert({ ...payload, is_system: false });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(t("roles.toastSaved")); setOpen(false); setEditing(null); load(); }
  }

  async function remove(id: string) {
    if (!confirm(t("roles.confirmDelete"))) return;
    const { error } = await supabase.from("custom_roles").delete().eq("id", id).eq("is_system", false);
    if (error) toast.error(error.message);
    else { toast.success(t("roles.toastDeleted")); load(); }
  }

  function togglePerm(key: string) {
    if (!editing) return;
    const perms = { ...(editing.permissions || {}) };
    perms[key] = !perms[key];
    if (key === "all" && perms[key]) {
      Object.keys(perms).forEach(k => { if (k !== "all") delete perms[k]; });
    } else if (perms["all"]) {
      delete perms["all"];
    }
    setEditing({ ...editing, permissions: perms });
  }

  if (!canEdit) return <Card><CardContent className="p-10 text-center">{t("roles.accessDenied")}</CardContent></Card>;
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-teal-600" /> {t("roles.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("roles.pageSubtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ name: "", slug: "", permissions: {}, is_active: true })}><Plus className="w-4 h-4 me-1" /> {t("roles.newRoleBtn")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={dir}>
            <DialogHeader><DialogTitle>{editing?.id ? t("roles.editRole") : t("roles.newRole")}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>{t("roles.nameLabel")}</Label><Input value={editing?.name || ""} onChange={e => setEditing({ ...editing!, name: e.target.value })} className="mt-1" /></div>
              <div><Label>{t("roles.nameEnLabel")}</Label><Input value={editing?.name_en || ""} onChange={e => setEditing({ ...editing!, name_en: e.target.value })} className="mt-1" /></div>
              <div><Label>{t("roles.slugLabel")}</Label><Input value={editing?.slug || ""} onChange={e => setEditing({ ...editing!, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} className="mt-1 font-mono" /></div>
              <div><Label>{t("roles.descriptionLabel")}</Label><Input value={editing?.description || ""} onChange={e => setEditing({ ...editing!, description: e.target.value })} className="mt-1" /></div>
              <div className="space-y-2">
                <Label>{t("roles.permissions")}</Label>
                <div className="grid gap-2 rounded-xl border p-3 max-h-60 overflow-y-auto">
                  {PERMISSION_KEYS.map(pk => (
                    <label key={pk.key} className="flex items-center justify-between gap-2 text-sm">
                      <span>{pk.label} <span className="text-xs text-muted-foreground">({pk.labelEn})</span></span>
                      <Switch checked={!!editing?.permissions?.[pk.key]} onCheckedChange={() => togglePerm(pk.key)} />
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={save} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("roles.saveBtn")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {roles.map(r => (
          <Card key={r.id} className={r.is_system ? "bg-slate-50" : "hover:shadow-md transition"}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{r.name} <span className="text-xs text-muted-foreground">({r.slug})</span></span>
                <div className="flex gap-1">
                  {r.is_system ? <Badge variant="outline">{t("roles.systemBadge")}</Badge> : <Badge className="bg-violet-600">{t("roles.customBadge")}</Badge>}
                  {r.is_active ? <Badge className="bg-emerald-600">{t("roles.activeBadge")}</Badge> : <Badge variant="destructive">{t("roles.inactiveBadge")}</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{r.description || "—"}</p>
              <div className="flex flex-wrap gap-1">
                {Object.keys(r.permissions || {}).map(k => (
                  <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>
                ))}
                {Object.keys(r.permissions || {}).length === 0 && <span className="text-xs text-muted-foreground">{t("roles.noPermissions")}</span>}
              </div>
              {!r.is_system && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(r); setOpen(true); }}><Edit className="w-3 h-3 me-1" /> {t("roles.editBtn")}</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
