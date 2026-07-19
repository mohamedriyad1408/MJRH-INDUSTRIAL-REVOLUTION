import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AuthProvider } from "@/core/auth/useAuth";
import { CurrencyProvider } from "@/hooks/use-currency";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { reportClientError } from "@/lib/client-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">الصفحة المطلوبة غير متاحة.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    const msg = (error.message || "").toLowerCase();
    const isChunkError = msg.includes("mime type") || msg.includes("dynamically imported module") || msg.includes("loading chunk") || msg.includes("importing a module script") || msg.includes("failed to fetch");
    
    if (isChunkError && typeof window !== "undefined") {
      const storageKey = `mjrh_chunk_reload_${window.location.pathname}`;
      const lastReload = Number(sessionStorage.getItem(storageKey) || 0);
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem(storageKey, String(Date.now()));
        window.location.reload();
        return;
      }
    }
    reportClientError(error, { source: "router.error", severity: "fatal" });
  }, [error]);

  const isChunkError = (error.message || "").toLowerCase().includes("mime type") || (error.message || "").toLowerCase().includes("dynamically imported module");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-white" dir="rtl">
      <div className="max-w-md w-full p-8 text-center rounded-3xl bg-slate-800 border border-teal-500/30 shadow-2xl space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center text-3xl font-black">

        </div>
        <h1 className="text-xl font-black text-white">
          {isChunkError ? "جاري تحديث وتشغيل الإصدار الجديد" : "حدث خطأ غير متوقع في التشغيل"}
        </h1>
        <p className="text-xs text-slate-300 font-medium leading-relaxed">
          {isChunkError
            ? "تم إطلاق تحديث جديد للتو على خوادم المنصة لتحسين الأداء وسرعة التشغيل. يرجى الضغط على زر التحديث لتشغيل أحدث إصدار."
            : error.message}
        </p>
        <button
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
            else reset();
          }}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 font-black text-white shadow-lg text-sm transition"
        >
          تحديث الصفحة وتشغيل أحدث إصدار &larr;
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <I18nProvider>
      <AuthProvider>
        <CurrencyProvider>
          <Outlet />
        </CurrencyProvider>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </I18nProvider>
  );
}
