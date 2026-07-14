import { Globe2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, useI18n, type LanguageCode } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className="flex items-center gap-2" dir="ltr">
      {!compact && <Globe2 className="w-4 h-4 text-muted-foreground" />}
      <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
        <SelectTrigger className={compact ? "h-8 w-[92px] text-xs" : "h-9 w-[150px]"} aria-label={t("common.language")}> 
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((l) => <SelectItem key={l.code} value={l.code}>{l.nativeName}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
