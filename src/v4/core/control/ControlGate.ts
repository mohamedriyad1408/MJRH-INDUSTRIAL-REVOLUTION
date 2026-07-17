import { supabase } from "@/integrations/supabase/client";

/**
 * ControlGate — Sovereign Control Plane Interface
 * Responsibility: Cross-root administration and conglomerate-wide strategy.
 * Rule: Only accessible by Holding-level Administrators.
 */
export class ControlGate {
  /**
   * Provisions a completely new Sovereign Enterprise Root.
   */
  static async provisionEnterprise(holdingId: string, name: string, urn: string, ownerId: string) {
    const { data, error } = await supabase.rpc("fn_v_provision_new_enterprise", {
      _holding_node_id: holdingId,
      _legal_name: name,
      _global_urn: urn,
      _owner_identity_id: ownerId,
    });

    if (error) throw new Error(`[CONTROL_PROVISION_FAIL]: ${error.message}`);
    return data;
  }

  /**
   * Pushes a global DNA standard to all subsidiaries.
   */
  static async dispatchStrategy(holdingId: string, dnaId: string) {
    const { data, error } = await supabase.rpc("fn_v_dispatch_conglomerate_strategy", {
      _holding_node_id: holdingId,
      _dna_registry_id: dnaId,
    });

    if (error) throw new Error(`[CONTROL_DISPATCH_FAIL]: ${error.message}`);
    return data as number; // Count of roots notified
  }

  /**
   * Fetches the consolidated health status of the entire conglomerate.
   */
  static async getConsolidatedHealth(holdingId: string) {
    const { data, error } = await supabase
      .from("v4_control.v_consolidated_scoreboard")
      .select("*")
      .eq("holding_node_id", holdingId)
      .single();

    if (error) throw new Error(`[CONTROL_SCOREBOARD_FAIL]: ${error.message}`);
    return data;
  }
}
