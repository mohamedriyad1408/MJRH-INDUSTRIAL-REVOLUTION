import { supabase } from "@/integrations/supabase/client";
import { sanitizeErrorText, sanitizeStack } from "@/lib/rules/error-sanitizer";

type ReportOptions = {
  source?: string;
  severity?: "info" | "warning" | "error" | "fatal";
  metadata?: Record<string, unknown>;
};

let installed = false;
let lastMessage = "";
let lastAt = 0;

function shouldThrottle(message: string) {
  const now = Date.now();
  if (message === lastMessage && now - lastAt < 3000) return true;
  lastMessage = message;
  lastAt = now;
  return false;
}

export async function reportClientError(error: unknown, options: ReportOptions = {}) {
  try {
    const message = sanitizeErrorText(error);
    if (!message || shouldThrottle(message)) return;

    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
    const user = sessionData?.session?.user ?? null;
    let tenantId: string | null = null;
    if (user?.id) {
      try {
        const { data: role } = await supabase
          .from("user_roles")
          .select("tenant_id")
          .eq("user_id", user.id)
          .not("tenant_id", "is", null)
          .limit(1)
          .maybeSingle();
        tenantId = role?.tenant_id ?? null;
      } catch {
        tenantId = null;
      }
    }

    await (supabase as any).from("client_error_logs").insert({
      tenant_id: tenantId,
      user_id: user?.id ?? null,
      severity: options.severity ?? "error",
      source: options.source ?? "frontend",
      message,
      stack: sanitizeStack(error),
      path: typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      metadata: options.metadata ?? {},
    });
  } catch {
    // Error reporting must never break the app.
  }
}

export function installClientErrorReporting() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (event) => {
    reportClientError(event.error ?? event.message, { source: "window.error", severity: "error" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportClientError(event.reason, { source: "unhandledrejection", severity: "error" });
  });
}
