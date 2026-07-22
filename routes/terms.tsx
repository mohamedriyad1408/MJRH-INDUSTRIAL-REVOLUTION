import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms - MJRH" }] }),
  component: TermsPage,
});

function TermsPage() {
  const { t, dir } = useI18n();
  return <main className="min-h-screen bg-slate-50 p-4" dir={dir}><Card className="max-w-3xl mx-auto"><CardContent className="p-8 space-y-4 leading-8"><div className="flex items-center justify-between gap-3"><h1 className="text-3xl font-black">{t("common.legal.termsTitle")}</h1><LanguageSwitcher compact /></div><p>{t("terms.p1")}</p><p>{t("terms.p2")}</p><p>{t("terms.p3")}</p><p>{t("terms.p4")}</p><p>{t("terms.p5")}</p><Link to="/landing" className="text-teal-700 underline">{t("common.back")}</Link></CardContent></Card></main>;
}
