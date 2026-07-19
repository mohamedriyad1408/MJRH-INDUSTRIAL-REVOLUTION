import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
  notFoundComponent: () => {
    const { t } = useI18n();
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="mt-4 text-xl font-semibold">{t("common.الصفحة_غير_موجودة")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.الصفحة_المطلوبة_غير_متاحة")}</p>
        <Button asChild className="mt-6">
          <Link to="/">{t("common.العودة_للرئيسية")}</Link>
        </Button>
      </div>
    );
  },
  errorComponent: ({ error, reset }: any) => {
    const { t } = useI18n();
    const isChunkError = error?.message?.includes("Failed to fetch dynamically imported module") || 
                        error?.message?.includes("Importing a module script failed");
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-black text-white">
            {isChunkError ? t("common.جاري_تحديث_وتشغيل_الإصدار_الجديد") : t("common.حدث_خطأ_غير_متوقع_في_التشغيل")}
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-4 mb-8 leading-relaxed">
            {isChunkError 
              ? t("common.نحن_نقوم_بتحديث_النظام_لأحدث_إصدار_سيادي_")
              : error?.message || t("common.يرجى_المحاولة_مرة_أخرى_أو_التواصل_مع_")
            }
          </p>
          <Button onClick={() => isChunkError ? window.location.reload() : reset()} className="w-full h-12 rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-black">
            <RefreshCw className="w-4 h-4 me-2" />
            {t("common.إعادة_المحاولة_الآن")}
          </Button>
        </div>
      </div>
    );
  }
});

function Root() {
  return (
    <>
      <Outlet />
    </>
  );
}
