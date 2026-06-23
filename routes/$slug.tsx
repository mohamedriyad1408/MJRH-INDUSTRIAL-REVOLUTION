import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Shirt, Users, UserPlus, LogIn, MapPin } from "lucide-react";

export const Route = createFileRoute("/$slug")({
  head: () => ({ meta: [{ title: "مدخل المغسلة" }] }),
  component: TenantEntryPage,
});

type Tenant = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  brand_color?: string | null;
  business_address?: string | null;
  business_phone?: string | null;
};

function TenantEntryPage() {
  const { slug } = Route.useParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any)
      .from("tenants")
      .select("id,name,slug,logo_url,brand_color,business_address,business_phone")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }: any) => setTenant(data ?? null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" dir="rtl">
        <Card className="max-w-md w-full"><CardContent className="p-8 text-center text-muted-foreground">رابط مغسلة غير صالح أو غير مفعل.</CardContent></Card>
      </div>
    );
  }

  const color = tenant.brand_color || "#0d9488";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ccfbf1,#f8fafc_45%,#e0f2fe)] p-4 flex items-center justify-center" dir="rtl">
      <Card className="w-full max-w-lg overflow-hidden border-0 shadow-2xl">
        <div className="p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${color}, #0f172a)` }}>
          <div className="w-20 h-20 mx-auto rounded-3xl bg-white/15 flex items-center justify-center mb-4 overflow-hidden">
            {tenant.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover" /> : <Shirt className="w-11 h-11" />}
          </div>
          <h1 className="text-3xl font-black">{tenant.name}</h1>
          <p className="text-sm text-white/80 mt-2">مدخل العملاء والموظفين والمالك</p>
          {tenant.business_address && <p className="text-xs text-white/70 mt-3 flex justify-center gap-1"><MapPin className="w-3 h-3" /> {tenant.business_address}</p>}
        </div>
        <CardContent className="p-6 space-y-3">
          <Button asChild className="w-full h-14 text-base font-black bg-teal-600 hover:bg-teal-700">
            <Link to="/customer-portal" search={{ tenant: tenant.slug } as any}>
              <Users className="w-5 h-5 ms-2" /> دخول العملاء
            </Link>
          </Button>

          <Button asChild variant="secondary" className="w-full h-14 text-base font-black">
            <Link to="/join/$slug" params={{ slug: tenant.slug }}>
              <UserPlus className="w-5 h-5 ms-2" /> تسجيل عميل جديد
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full h-14 text-base font-black">
            <Link to="/login" search={{ tenant: tenant.slug } as any}>
              <LogIn className="w-5 h-5 ms-2" /> دخول الموظفين والمالك
            </Link>
          </Button>

          {tenant.business_phone && <a href={`tel:${tenant.business_phone}`} className="block text-center text-sm text-muted-foreground hover:underline pt-2">اتصل بالمغسلة: {tenant.business_phone}</a>}
        </CardContent>
      </Card>
    </div>
  );
}
