import { supabase } from "@/integrations/supabase/client";

export interface SovereignContext {
  sovereignId: string;
  nodeId: string;
  path: string;
}

export class TrustGate {
  /**
   * ResolveStructuralContext: Finds the Sovereign Root for any node.
   */
  async resolveStructuralContext(nodeId: string): Promise<SovereignContext> {
    const { data, error } = await supabase
      .from('v4_l1.nodes')
      .select('id, node_path')
      .eq('id', nodeId)
      .single();
    
    if (error || !data) throw new Error("SOVEREIGN_CONTEXT_NOT_FOUND");

    // Extract root from ltree path (first label)
    const rootLabel = data.node_path.split('.')[0];
    const rootId = rootLabel.replace('_', '');
    
    // Convert back to UUID format if necessary or use as is
    return {
      sovereignId: rootId,
      nodeId: nodeId,
      path: data.node_path
    };
  }

  /**
   * ResolveHierarchy: Returns the full structural path.
   */
  async resolveHierarchy(nodeId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('v4_l1.nodes')
      .select('node_path')
      .eq('id', nodeId)
      .single();
    
    if (error) throw new Error("HIERARCHY_RESOLUTION_FAILED");
    return data.node_path.split('.');
  }

  /**
   * ValidateStructuralBoundary: Hard check between two nodes.
   */
  async validateStructuralBoundary(nodeA: string, nodeB: string): Promise<boolean> {
    const rootA = await this.resolveStructuralContext(nodeA);
    const rootB = await this.resolveStructuralContext(nodeB);
    return rootA.sovereignId === rootB.sovereignId;
  }
}
