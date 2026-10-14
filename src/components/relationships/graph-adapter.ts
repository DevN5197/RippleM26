import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { RelationshipGraphData, RelationshipGraphNode, RelationshipGraphEdge } from "@/types";
import type { CustomNodeData } from "./relationship-node";

// Deterministic stage positions (X-coordinates by process sequence)
const STAGE_X: Record<string, number> = {
  // Main cycle
  node_sup_1: 60,
  node_pay_1: 360,
  node_po_1: 660,
  node_delivery_1: 960,
  node_pay_3: 960,
  node_stock_1: 1260,
  node_cus_1: 1260,
  node_co_1: 1560,
  node_inv_2001: 1860,
  node_rec_2001: 2160,
  node_risk_1: 1280,

  // Secondary cycle (Mehta Fabrics)
  node_sup_2: 60,
  node_po_2: 360,
  node_delivery_2: 660,
  node_pay_po2: 660,

  // Customer Receivables (Style Mart)
  node_cus_2: 960,
  node_inv_1999: 1260,
  node_co_2: 1260,
  node_inv_2002: 1560,
  node_rec_2002: 1860,
};

// Deterministic vertical positions (Y-coordinates)
const STAGE_Y: Record<string, number> = {
  // Main cycle (Upper half)
  node_sup_1: 100,
  node_pay_1: 100,
  node_po_1: 100,
  node_delivery_1: 60,
  node_pay_3: 240,
  node_stock_1: 60,
  node_cus_1: 220,
  node_co_1: 100,
  node_inv_2001: 100,
  node_rec_2001: 100,
  node_risk_1: 360,

  // Secondary cycle & Style Mart (Lower half)
  node_sup_2: 480,
  node_po_2: 480,
  node_delivery_2: 440,
  node_pay_po2: 580,
  node_cus_2: 700,
  node_inv_1999: 780,
  node_co_2: 640,
  node_inv_2002: 640,
  node_rec_2002: 640,
};

export interface GraphAdapterOptions {
  selectedNodeId?: string | null | undefined;
  filteredNodeIds?: Set<string> | undefined;
}

export function computeDependencySets(
  selectedNodeId: string | undefined | null,
  edges: RelationshipGraphEdge[],
) {
  const upstreamNodeIds = new Set<string>();
  const downstreamNodeIds = new Set<string>();
  const highlightedEdgeIds = new Set<string>();

  if (!selectedNodeId) {
    return { upstreamNodeIds, downstreamNodeIds, highlightedEdgeIds };
  }

  // Traverse upstream (incoming edges)
  const upstreamQueue = [selectedNodeId];
  while (upstreamQueue.length > 0) {
    const current = upstreamQueue.shift()!;
    const incomingEdges = edges.filter((e) => e.target === current);
    for (const edge of incomingEdges) {
      highlightedEdgeIds.add(edge.id);
      if (!upstreamNodeIds.has(edge.source)) {
        upstreamNodeIds.add(edge.source);
        upstreamQueue.push(edge.source);
      }
    }
  }

  // Traverse downstream (outgoing edges)
  const downstreamQueue = [selectedNodeId];
  while (downstreamQueue.length > 0) {
    const current = downstreamQueue.shift()!;
    const outgoingEdges = edges.filter((e) => e.source === current);
    for (const edge of outgoingEdges) {
      highlightedEdgeIds.add(edge.id);
      if (!downstreamNodeIds.has(edge.target)) {
        downstreamNodeIds.add(edge.target);
        downstreamQueue.push(edge.target);
      }
    }
  }

  return { upstreamNodeIds, downstreamNodeIds, highlightedEdgeIds };
}

export function adaptToReactFlow(
  data: RelationshipGraphData,
  options: GraphAdapterOptions = {},
): {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
} {
  const { selectedNodeId, filteredNodeIds } = options;

  const { upstreamNodeIds, downstreamNodeIds, highlightedEdgeIds } = computeDependencySets(
    selectedNodeId,
    data.edges,
  );

  const isSelectionActive = Boolean(selectedNodeId);

  // Transform Nodes
  const nodes: Node<CustomNodeData>[] = data.nodes
    .filter((n) => !filteredNodeIds || filteredNodeIds.has(n.id))
    .map((node, index) => {
      const isSelected = node.id === selectedNodeId;
      const isUpstream = upstreamNodeIds.has(node.id);
      const isDownstream = downstreamNodeIds.has(node.id);
      const isConnected = isSelected || isUpstream || isDownstream;
      const isDimmed = isSelectionActive && !isConnected;

      // Deterministic layout with fallback grid
      const x = STAGE_X[node.id] ?? 80 + (index % 5) * 300;
      const y = STAGE_Y[node.id] ?? 100 + Math.floor(index / 5) * 160;

      return {
        id: node.id,
        type: "custom",
        position: { x, y },
        data: {
          node,
          isSelected,
          isUpstream,
          isDownstream,
          isDimmed,
        },
      };
    });

  // Transform Edges
  const validNodeIds = new Set(nodes.map((n) => n.id));

  const edges: Edge[] = data.edges
    .filter((e) => validNodeIds.has(e.source) && validNodeIds.has(e.target))
    .map((edge) => {
      const isHighlighted = highlightedEdgeIds.has(edge.id);
      const isDimmed = isSelectionActive && !isHighlighted;
      const isAtRisk = edge.status === "at_risk";

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: isHighlighted || isAtRisk,
        label: edge.description,
        labelStyle: {
          fontSize: 10,
          fontWeight: isHighlighted ? 600 : 500,
          fill: isHighlighted ? "var(--foreground)" : "var(--muted-foreground)",
        },
        labelBgStyle: {
          fill: "var(--card)",
          fillOpacity: 0.92,
        },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isHighlighted
            ? "var(--primary)"
            : isAtRisk
              ? "var(--warning)"
              : "var(--muted-foreground)",
        },
        style: {
          strokeWidth: isHighlighted ? 2.5 : 1.5,
          stroke: isHighlighted ? "var(--primary)" : isAtRisk ? "var(--warning)" : "var(--border)",
          opacity: isDimmed ? 0.3 : 0.95,
          transition: "all 0.2s ease",
        },
      };
    });

  return { nodes, edges };
}
