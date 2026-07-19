import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Store, Download, Star, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/marketplace")({
  head: () => ({ meta: [{ title: "سوق القوالب — Marketplace" }] }),
  component: MarketplacePage,
});

type Template = {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  stages: any[];
  is_featured: boolean;
  downloads: number;
};

function MarketplacePage() {
  const { dir, language } = useI18n();
  const { tenantId } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("workflow_templates").select("*").eq("is_active", true).order("is_featured", { ascending: false }).order("downloads", { ascending: false });
    setTemplates((data ?? []) as Template[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function applyTemplate(slug: string) {
    if (!tenantId) return;
    if (!confirm(`هل تريد تطبيق قالب "${slug}"؟ سيتم تعطيل المراحل الحالية.`)) return;
    setApplying(slug);
    const { data, error } = await supabase.rpc("apply_workflow_template", { _tenant_id: tenantId, _template_slug: slug });
    if (error) toast.error(error.message);
    else {
      toast.success(`تم تطبيق القالب (${data} مراحل)`);
      await supabase.from("workflow_templates").update({ downloads: (templates.find(t => t.slug === slug)?.downloads || 0) + 1 }).eq("slug", slug);
    }
    setApplying(null);
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><Store className="w-6 h-6 text-teal-600" /> سوق قوالب الأنشطة</h1>
        <p className="text-sm text-muted-foreground">اختر قالب نشاطك الجاهز — مغسلة، ورشة، غسيل سيارات، مطعم... وطبقه في مشروعك بضغطة</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tpl => (
          <Card key={tpl.id} className="hover:shadow-xl transition-all hover:-translate-y-1 border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-lg"><span className="text-2xl">{tpl.icon}</span> {language === "en" && tpl.name_en ? tpl.name_en : tpl.name}</span>
                {tpl.is_featured && <Badge className="bg-amber-500"><Star className="w-3 h-3 me-1" /> مميز</Badge>}
              </CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{tpl.category}</Badge>
                <Badge variant="secondary">{tpl.stages?.length} مراحل</Badge>
                <Badge variant="outline">{tpl.downloads} استخدام</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">{tpl.description}</p>
              <div className="flex flex-wrap gap-1">
                {tpl.stages?.slice(0, 5).map((s: any, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-slate-100 border">{s.icon} {s.name}</span>
                ))}
                {(tpl.stages?.length || 0) > 5 && <span className="text-xs text-muted-foreground">+{tpl.stages.length - 5}</span>}
              </div>
              <Button className="w-full font-bold" onClick={() => applyTemplate(tpl.slug)} disabled={applying === tpl.slug}>
                {applying === tpl.slug ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 me-2" /> تطبيق القالب</>}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-slate-50 border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          عند تطبيق قالب، سيتم تعطيل المراحل الحالية وإنشاء المراحل الجديدة. يمكنك تعديلها بعد ذلك من إعدادات المراحل.
        </CardContent>
      </Card>
    </div>
  );
}
