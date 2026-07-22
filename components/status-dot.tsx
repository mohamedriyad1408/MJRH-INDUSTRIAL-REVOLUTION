import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type StatusLevel = "ok" | "attention" | "urgent" | "waiting";

const COLOR: Record<StatusLevel, string> = {
  ok:        "bg-emerald-500",
  attention: "bg-amber-400",
  urgent:    "bg-red-500 animate-pulse",
  waiting:   "bg-blue-400",
};

const RING: Record<StatusLevel, string> = {
  ok:        "ring-emerald-200",
  attention: "ring-amber-200",
  urgent:    "ring-red-200",
  waiting:   "ring-blue-200",
};

interface StatusDotProps {
  level: StatusLevel;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
  className?: string;
}

const SIZES = { sm: "w-2 h-2", md: "w-3 h-3", lg: "w-4 h-4" };

export function StatusDot({ level, size = "md", ring = false, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full flex-shrink-0",
        SIZES[size],
        COLOR[level],
        ring && `ring-2 ${RING[level]}`,
        className
      )}
    />
  );
}

export function StatusBadge({ level, label }: { level: StatusLevel; label: string }) {
  const bg: Record<StatusLevel, string> = {
    ok:        "bg-emerald-50 text-emerald-700 border-emerald-200",
    attention: "bg-amber-50 text-amber-700 border-amber-200",
    urgent:    "bg-red-50 text-red-700 border-red-200",
    waiting:   "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border", bg[level])}>
      <StatusDot level={level} size="sm" />
      {label}
    </span>
  );
}
