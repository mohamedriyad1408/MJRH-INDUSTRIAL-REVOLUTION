import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type RealtimeOptions = {
  /** Tables to subscribe to */
  tables: string[];
  /** Callback when any subscribed table changes */
  onChange: () => void;
  /** Filter by tenant_id (default: from auth context) */
  tenantId?: string;
  /** Enable/disable the subscription */
  enabled?: boolean;
};

/**
 * Subscribe to real-time Postgres changes on specified tables.
 * Automatically filters by tenant_id for data isolation.
 * Auto-cleanup on unmount.
 */
export function useRealtime({ tables, onChange, tenantId: tid, enabled = true }: RealtimeOptions) {
  const { tenantId: authTenantId } = useAuth();
  const tenantId = tid || authTenantId;
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  const stableOnChange = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!enabled || !tenantId || !tables.length) return;

    const channelName = `rt-${tables.join("-")}-${tenantId.slice(0, 8)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tables[0],
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => stableOnChange()
      );

    // Subscribe to additional tables
    for (let i = 1; i < tables.length; i++) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tables[i],
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => stableOnChange()
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, tenantId, tables.join(","), stableOnChange]);
}

/**
 * Simple real-time subscription for a single table.
 * Returns nothing; just calls `callback` on changes.
 */
export function useTableRealtime(table: string, callback: () => void, enabled = true) {
  useRealtime({ tables: [table], onChange: callback, enabled });
}
