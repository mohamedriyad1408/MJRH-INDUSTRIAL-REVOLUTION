import { CURRENCIES, type CurrencyCode } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const REGION_GROUPS = [
  { label: "مصر", codes: ["EGP"] as CurrencyCode[] },
  { label: "الخليج العربي", codes: ["SAR", "AED", "QAR", "KWD", "BHD"] as CurrencyCode[] },
  { label: "أوروبا وأمريكا", codes: ["USD", "EUR"] as CurrencyCode[] },
];

export function CurrencySelector({
  value,
  onChange,
  compact = false,
}: {
  value: CurrencyCode;
  onChange: (v: CurrencyCode) => void;
  compact?: boolean;
}) {
  const cfg = CURRENCIES[value];
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CurrencyCode)}>
      <SelectTrigger className={compact ? "w-32" : "w-48"}>
        <SelectValue>
          {cfg ? `${cfg.symbol} ${cfg.labelAr}` : value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {REGION_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">{group.label}</div>
            {group.codes.map((code) => {
              const c = CURRENCIES[code];
              return (
                <SelectItem key={code} value={code}>
                  <span className="font-bold">{c.symbol}</span>
                  <span className="ms-2">{c.labelAr}</span>
                  <span className="ms-1 text-xs text-muted-foreground">({c.code})</span>
                </SelectItem>
              );
            })}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
