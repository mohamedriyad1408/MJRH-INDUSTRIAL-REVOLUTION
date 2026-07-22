import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { reportClientError } from "@/lib/client-error-reporting";
import { useI18n } from "@/lib/i18n";

function NotFoundComponent() {
  const { t, dir } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir={dir}>
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("errors.pageNotFound", "الصفحة غير موجودة")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.pageNotFoundDetail", "الصفحة المطلوبة غير متاحة.")}</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("common.backToHome", "العودة للرئيسية")}
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const { t, dir } = useI18n();
  useEffect(() => { reportClientError(error, { source: "router.error", severity: "fatal" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir={dir}>
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{t("errors.unexpectedError", "حدث خطأ غير متوقع")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("common.retry", "إعادة المحاولة")}
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
    <AuthProvider>
      <Outlet />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
