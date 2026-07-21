import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wrench } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type Check = {
  key: string;
  title: string;
  count: number;
  okWhenZero?: boolean;
  href?: string;
  fix?: string;
  severity: "ok" | "warn" | "danger";
  details?: { label: string; sub?: string; href?: string }[];
  error?: string;
};

export function deliveryIssuesAr(codes: string[] = [], t: any) {
  const m: Record<string,string> = { no_units: t("del.issue.no_units", "لا توجد قطع"), reclean_open: t("del.issue.reclean_open", "مرتجع مفتوح"), label_issue: t("del.issue.label_issue", "مشكلة مارك/ليبل"), qc_missing: t("del.issue.qc_missing", "قطع غير معتمدة QC"), no_driver: t("del.issue.no_driver", "بلا مندوب"), unpaid: t("del.issue.unpaid", "غير مدفوع") };
  return codes.map((c) => m[c] ?? c).join("، ") || t("system.deliveryBlocked", "غير جاهز");
}

export const healthGroups = [
  { key: "readiness", titleKey: "system.group.readiness" },
  { key: "finance", titleKey: "system.group.finance" },
  { key: "operations", titleKey: "system.group.operations" },
  { key: "delivery", titleKey: "system.group.delivery" },
  { key: "quality", titleKey: "system.group.quality" },
  { key: "apdo", titleKey: "system.group.apdo" },
];
export function groupForCheck(key: string) {
  if (["tenantReady", "settings", "employees", "services", "customers"].includes(key)) return "readiness";
  if (["cash", "chart", "cashBalanceIntegrity", "journal", "manualNoJournal", "cashClosing", "oldPayables", "financialAudit"].includes(key)) return "finance";
  if (["noPieces", "stuckOrders", "invoice"].includes(key)) return "operations";
  if (["pickups", "readyNoDriver", "deliveryReadiness", "driverLocation", "ordersNoLocation", "customersNoAddress"].includes(key)) return "delivery";
  if (["reclean", "qc", "labelIssues", "unpaid", "proof"].includes(key)) return "quality";
  return "apdo";
}
export function readinessAr(k: string, t: any) { return ({ has_settings: t("readiness.has_settings", "الإعدادات"), has_branch: t("readiness.has_branch", "الفرع"), has_cash_account: t("readiness.has_cash_account", "الخزنة"), has_chart_accounts: t("readiness.has_chart_accounts", "شجرة الحسابات"), has_employee: t("readiness.has_employee", "موظف نشط"), has_catalog: t("readiness.has_catalog", "كتالوج الخدمات") } as Record<string,string>)[k] ?? k; }
export function safeFixHref(href?: string | null) {
  if (!href) return "/system-health";
  // /ledger is owner-only. For actionable repairs, /accounting is available to owner/ops_manager.
  if (href === "/ledger" || href.startsWith("/ledger")) return "/accounting";
  return href;
}

export function HealthCard({ c, fixingKey, repairing, fixCheck }: { c: Check; fixingKey: string | null; repairing: boolean; fixCheck: (key: string) => void }) {
  const { t } = useI18n();
  const cls = c.severity === "danger" ? "border-red-200 bg-red-50" : c.severity === "warn" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50";
  const canAutoFix = ["cash", "chart", "settings", "employees", "cashBalanceIntegrity", "manualNoJournal", "journal", "pickups", "readyNoDriver", "driverLocation", "cashClosing", "financialAudit"].includes(c.key);
  return <Card className={cls}><CardContent className="p-4 space-y-3">
    <div className="flex items-center justify-between gap-2"><div className="font-black">{c.title}</div><Badge variant={c.severity === "danger" ? "destructive" : "secondary"}>{c.count}</Badge></div>
    <div className="text-xs text-muted-foreground">{c.fix}</div>
    {c.error && <div className="rounded-lg bg-white/70 border border-red-100 px-2 py-1 text-xs text-red-700 break-words">{t("system.readingError")} {c.error}</div>}
    {c.details?.length ? <div className="space-y-1">{c.details.map((d, i) => { const row = <div className="rounded-lg bg-white/70 border px-2 py-1 text-xs"><div className="font-bold">{d.label}</div>{d.sub && <div className="text-muted-foreground">{d.sub}</div>}</div>; return d.href ? <Link key={i} to={d.href as any}>{row}</Link> : <div key={i}>{row}</div>; })}</div> : null}
    <div className="flex gap-2 pt-1">{c.href && <Button asChild size="sm" variant="outline"><Link to={c.href as any}>{t("common.openFixLocation")}</Link></Button>}{canAutoFix && <Button size="sm" onClick={() => fixCheck(c.key)} disabled={fixingKey === c.key || repairing}>{fixingKey === c.key ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Wrench className="w-4 h-4 ms-1" />}{t("common.quickFix")}</Button>}</div>
  </CardContent></Card>;
}

export function answerAr(s: string, t: any) {
  return ({ answered: t("apdo.answered", "مكتمل"), missing_branch: t("apdo.missing", "ناقص"), missing_cash_account: t("apdo.missing", "ناقص"), missing_journal: t("apdo.missing", "ناقص"), missing_report_bucket: t("apdo.missing", "ناقص"), missing_notification: t("apdo.missing", "ناقص"), not_applicable: t("apdo.not_applicable", "لا ينطبق"), not_required: t("apdo.not_required", "غير مطلوب") } as Record<string, string>)[s] ?? s;
}

export function Kpi({ title, value, tone }: { title: string; value: number; tone: "ok" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "border-red-200 bg-red-50 text-red-800" : tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return <Card className={cls}><CardContent className="p-4"><div className="text-xs opacity-80">{title}</div><div className="text-3xl font-black mt-1">{value}</div></CardContent></Card>;
}
