import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, RefreshCw, Copy, Eye, Building2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/demo-library")({
  head: () => ({ meta: [{ title: "Demo Library — مكتبة المشاريع الجاهزة" }] }),
  component: DemoLibraryPage,
});

function DemoLibraryPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [sandboxes, setSandboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: tpls }, { data: sbs }] = await Promise.all([
      supabase.from("demo_templates").select("*").eq("is_active", true).order("industry"),
      supabase.from("demo_sandboxes").select("*, demo_templates(name_ar, industry, icon), tenants!demo_sandboxes_tenant_id_fkey(slug, name)").order("created_at", { ascending: false }).limit(50),
    ]);
    setTemplates(tpls ?? []);
    setSandboxes(sbs ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function cloneTemplate(templateSlug: string, demoType: string) {
    const demoEmail = `${demoType}@mjrh.com`;
    const newSlug = `${demoType}-${Date.now().toString().slice(-6)}`;
    const newName = `${demoType} Demo — ${templateSlug}`;

    setCloning(templateSlug);
    try {
      const { data, error } = await supabase.rpc("clone_demo_template", {
        _template_slug: templateSlug,
        _new_tenant_slug: newSlug,
        _new_tenant_name: newName,
        _owner_email: demoEmail,
      });
      if (error) throw error;
      toast.success(`تم إنشاء Sandbox: ${newSlug} — Demo Login: ${demoEmail} / Demo@2026! — Production→Templates→Sandbox→Rollback`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCloning(null);
    }
  }

  async function deleteSandbox(id: string) {
    if (!confirm("حذف الـ Sandbox؟ لو اتبهدل... Delete واعمل Clone تاني")) return;
    const { error } = await supabase.rpc("delete_demo_sandbox", { _sandbox_id: id });
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف — اعمل Clone تاني"); load(); }
  }

  async function resetSandbox(id: string) {
    const { error } = await supabase.rpc("reset_demo_sandbox", { _sandbox_id: id });
    if (error) toast.error(error.message);
    else { toast.success("تم الـ Reset — Clone جديد"); load(); }
  }

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-black">Demo Library — مكتبة المشاريع الجاهزة</h1>
        <p className="text-sm text-muted-foreground mt-2">Production → Templates → Sandbox → Rollback — كل Demo هو Clone من Template، لو اتبهدل Delete واعمل Clone تاني — المستثمر نفسه يقدر يدخل بدون عرض مباشر</p>
        <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
          <Badge variant="outline">Demo Template System</Badge>
          <Badge variant="outline">Sandbox per Activity</Badge>
          <Badge variant="outline">Independent Login per Demo</Badge>
          <Badge variant="outline">GitHub Branch demo/sandbox-library → main</Badge>
          <Badge className="bg-emerald-600 text-white">Zero-Cost</Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <Card key={tpl.id} className="hover:shadow-lg transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><span className="text-2xl">{tpl.icon}</span> {tpl.name_ar}</CardTitle>
              <CardDescription className="text-xs">{tpl.description_ar} — {tpl.industry}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-1">
                <Badge variant="outline">{tpl.industry}</Badge>
                <Badge variant="secondary">{tpl.slug}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button size="sm" onClick={() => cloneTemplate(tpl.slug, tpl.slug.split("-")[0])} disabled={cloning === tpl.slug} className="w-full">
                  {cloning === tpl.slug ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Copy className="w-4 h-4 me-2" /> Clone → Sandbox</>}
                </Button>
                <div className="text-[11px] text-muted-foreground p-2 bg-slate-50 border rounded">
                  <b>Investor Login (بدون عرض مباشر):</b><br />
                  Hotel Demo: hotel.demo / *********<br />
                  Factory Demo: factory.demo / *********<br />
                  Hospital Demo: hospital.demo / *********
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-5 h-5" /> Sandboxes الحالية ({sandboxes.length}) — لو اتبهدل Delete واعمل Clone تاني</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-auto">
          {sandboxes.map((sb) => (
            <div key={sb.id} className="border rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">{sb.demo_templates?.name_ar} — {sb.tenants?.slug}</div>
                <div className="text-xs text-muted-foreground">{sb.demo_email} — {sb.demo_username} — {sb.status} — Reset {sb.reset_count}x</div>
                <div className="text-[11px] text-muted-foreground">Template: {sb.template_id} → Tenant: {sb.tenant_id}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" asChild><a href={`/${sb.tenants?.slug}/work-orders`} target="_blank"><Eye className="w-4 h-4" /></a></Button>
                <Button size="sm" variant="outline" onClick={() => resetSandbox(sb.id)}><RefreshCw className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => deleteSandbox(sb.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
            </div>
          ))}
          {sandboxes.length === 0 && <div className="text-center text-sm text-muted-foreground p-8">لا توجد Sandboxes — اعمل Clone من فوق</div>}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-white border-0">
        <CardContent className="p-4 text-sm leading-6">
          <b className="text-emerald-400">الأولوية الواقعية (من Support):</b><br />
          1. إنشاء Demo Template System<br />
          2. إنشاء Sandbox لكل نشاط<br />
          3. إنشاء Login مستقل لكل Demo<br />
          4. ربط كل التعديلات بفرع GitHub مخصص للـ Demo قبل دمجها في الرئيسي<br />
          بالترتيب ده المطور يعرف يبدأ منين وإيه اللي بعده، بدل ما يحاول ينفذ كل الأفكار مرة واحدة.
        </CardContent>
      </Card>
    </div>
  );
}
