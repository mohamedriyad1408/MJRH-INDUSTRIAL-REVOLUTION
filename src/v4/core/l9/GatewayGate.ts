import { supabase } from "@/integrations/supabase/client";

/**
 * GatewayGate — Layer 9 Universal API Gateway Interface
 * Responsibility: Manage external keys and verify inbound signals.
 * Logic: Every external signal must be cryptographically signed.
 */
export class GatewayGate {
  /**
   * Generates a new API Key for an Org-Node.
   */
  static async provisionKey(nodeId: string, name: string, capabilities: string[]) {
    // In production, this would return the raw secret ONCE and store the hash.
    const { data, error } = await supabase
      .from("v4_l9.api_keys")
      .insert({
        node_id: nodeId,
        key_name: name,
        key_prefix: `mjrh_${Math.random().toString(36).substring(2, 7)}`,
        key_hash: "SECRET_IN_VAULT", // Simplified for OS Core demo
        allowed_capabilities: capabilities,
      })
      .select()
      .single();

    if (error) throw new Error(`[L9_KEY_PROVISION_FAIL]: ${error.message}`);
    return data;
  }

  /**
   * Submits an external signal with a mock signature.
   */
  static async submitSignal(prefix: string, signature: string, capabilityId: string, payload: any) {
    const { data, error } = await supabase.rpc("rpc_submit_external_signal", {
      _key_prefix: prefix,
      _signature: signature,
      _capability_id: capabilityId,
      _payload: payload,
    });

    if (error) throw new Error(`[L9_GATEWAY_DENIED]: ${error.message}`);
    return data;
  }
}
