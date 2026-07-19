import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

type Branch = { id: string; name: string };

type Props = {
  value: string;
  onChange: (branchId: string) => void;
  /** Show "All branches" option */
  showAll?: boolean;
  /** Compact width for mobile */
  compact?: boolean;
  className?: string;
};

/**
 * Reusable branch filter selector.
 * Fetches branches for the current tenant and renders a Select dropdown.
 * Use "all" as the value for "all branches" mode.
 */
export function BranchFilter({ value, onChange, showAll = true, compact = false, className }: Props) {
  const { tenantId } = useAuth();
  const { t } = useI18n();
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("branches")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("created_at")
      .then(({ data }: { data: Branch[] | null }) => setBranches(data ?? []));
  }, [tenantId]);

  if (branches.length <= 1 && !showAll) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || (compact ? "w-36" : "w-44")}>
        <SelectValue placeholder={t("common.allBranches", "كل الفروع")} />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value="all">{t("common.allBranches", "كل الفروع")}</SelectItem>}
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Helper: Apply branch filter to a Supabase query.
 * If branchId is "all" or empty, returns the query unchanged.
 */
export function applyBranchFilter(query: any, branchId: string, column = "branch_id") {
  if (!branchId || branchId === "all") return query;
  return query.eq(column, branchId);
}
