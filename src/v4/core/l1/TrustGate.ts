import { supabase } from "@/integrations/supabase/client";

export interface SovereignContext {
  sovereignId: string;
  nodeId: string;
  path: string;
}

export class TrustGate {
  /**
   * ResolveStructuralContext: Finds the Sovereign Root via database RPC.
   * This is the single source of truth.
   */
  async resolveStructuralContext(nodeId: string): Promise<SovereignContext> {
    const { data, error } = await supabase.rpc('resolve_sovereign_root', { _node_id: nodeId });
    
    if (error || !data) throw new Error("SOVEREIGN_CONTEXT_NOT_FOUND");
    
    return {
        sovereignId: data.sovereign_id,
        nodeId: nodeId,
        path: data.path
    };
  }

  async resolveHierarchy(nodeId: string): Promise<string[]> {
    const { data, error } = await supabase.from('v4_l1.nodes').select('node_path').eq('id', nodeId).single();
    if (error) throw new Error("HIERARCHY_RESOLUTION_FAILED");
    return data.node_path.split('.');
  }

  async validateStructuralBoundary(nodeA: string, nodeB: string): Promise<boolean> {
    const rootA = await this.resolveStructuralContext(nodeA);
    const rootB = await this.resolveStructuralContext(nodeB);
    return rootA.sovereignId === rootB.sovereignId;
  }
}
