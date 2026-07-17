import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { reportClientError } from "@/lib/client-error-reporting";

type Props = {
  children: ReactNode;
  /** Name of the route/page for error reporting */
  routeName?: string;
  /** Fallback UI to show instead of default error card */
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Route-level error boundary that catches rendering errors
 * and shows a user-friendly fallback without crashing the entire app.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError(error, {
      source: `route.${this.props.routeName || "unknown"}`,
      severity: "error",
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunkError = (this.state.error?.message || "").toLowerCase().includes("dynamically imported module")
        || (this.state.error?.message || "").toLowerCase().includes("loading chunk");

      return (
        <div className="flex items-center justify-center min-h-[50vh] p-4" dir="rtl">
          <Card className="max-w-md w-full border-amber-200 bg-amber-50/50">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-amber-900">
                  {isChunkError ? "جاري تحديث الصفحة" : "حدث خطأ في هذه الصفحة"}
                </h2>
                <p className="text-sm text-amber-700 mt-1">
                  {isChunkError
                    ? "تم إطلاق تحديث جديد. اضغط على تحديث الصفحة لتشغيل أحدث إصدار."
                    : "نعتذر عن الإزعاج. يمكنك المحاولة مرة أخرى أو العودة للرئيسية."}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={this.handleRetry} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> المحاولة مرة أخرى
                </Button>
                <Button onClick={this.handleGoHome} className="gap-2 bg-teal-600 hover:bg-teal-700">
                  <Home className="w-4 h-4" /> الرئيسية
                </Button>
              </div>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <pre className="text-xs text-left bg-amber-100 p-3 rounded-lg overflow-auto max-h-32 text-amber-800 mt-2">
                  {this.state.error.message}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
