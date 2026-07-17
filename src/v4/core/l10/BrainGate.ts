import { supabase } from "@/integrations/supabase/client";

/**
 * BrainGate — Layer 10 Evolutionary Engine Interface
 * Responsibility: Manage system mutations and strategic optimizations.
 * Constraint: Every mutation requires L2 signature before injection.
 */
export class BrainGate {
  /**
   * Triggers an autonomous health scan to detect bottlenecks.
   */
  static async scanForOptimizations(nodeId: string) {
    const { data, error } = await supabase.rpc("fn_v_detect_and_propose_optimization", {
      _node_id: nodeId,
    });

    if (error) throw new Error(`[L10_SCAN_FAIL]: ${error.message}`);
    return data as string | null; // Returns mutation ID if found
  }

  /**
   * Approves and Injects a mutation into the system core.
   */
  static async injectMutation(mutationId: string, approverActorId: string) {
    const { error } = await supabase.rpc("fn_v_apply_mutation", {
      _mutation_id: mutationId,
      _approver_actor_id: approverActorId,
    });

    if (error) throw new Error(`[L10_INJECTION_DENIED]: ${error.message}`);
    return { ok: true };
  }

  /**
   * Fetches proposed mutations for strategic review.
   */
  static async getProposals(sovereignRootId: string) {
    const { data, error } = await supabase
      .from("v4_l10.mutations")
      .select("*")
      .eq("sovereign_root_id", sovereignRootId)
      .eq("status", "PROPOSED");

    if (error) throw new Error(`[L10_FETCH_FAIL]: ${error.message}`);
    return data;
  }
}
