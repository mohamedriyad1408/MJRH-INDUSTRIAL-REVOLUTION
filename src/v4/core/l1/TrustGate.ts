import { supabase } from "@/integrations/supabase/client";

export class TrustGate {
  async resolveStructuralContext(nodeId: string) {
    const { data, error } = await supabase.rpc('resolve_sovereign_root', { _node_id: nodeId });
    if (error || !data) throw new Error("SOVEREIGN_CONTEXT_NOT_FOUND");
    return data;
  }

  /**
   * ResolveHierarchy: Now uses a server-side RPC to maintain structural integrity.
   */
  async resolveHierarchy(nodeId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('resolve_hierarchy', { _node_id: nodeId });
    if (error) throw new Error("HIERARCHY_RESOLUTION_FAILED");
    return data; // Returns array of UIDs directly
  }
}
