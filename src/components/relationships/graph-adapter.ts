import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { RelationshipGraphData, RelationshipGraphNode, RelationshipGraphEdge } from "@/types";
import type { CustomNodeData } from "./relationship-node";

// Deterministic stage positions (X-coordinates by process sequence)
export const STAGE_X: Record<string, number> = {
  // Chain 1: Primary Operating Cycle (Shree Textiles -> Urban Threads)
  node_sup_1: 60,
  node_pay_1: 530,
  node_po_1: 1000,
  node_delivery_1: 1470,
  node_pay_3: 1470,
  node_stock_1: 1940,
  node_risk_1: 1940,
  node_co_1: 2410,
  node_cus_1: 2410,       // Directly above customer sale node_co_1
  node_inv_2001: 2880,
  node_rec_2001: 3350,

  // Chain 2: Secondary cycle (Mehta Fabrics)
  node_sup_2: 60,
  node_po_2: 530,
  node_delivery_2: 1000,
  node_pay_po2: 1000,

  // Chain 3: Customer Receivables & Overdue Risk (Style Mart)
  node_cus_2: 60,
  node_inv_1999: 530,
  node_co_2: 530,
  node_inv_2002: 1000,
  node_rec_2002: 1470,
};

// Deterministic vertical positions (Y-coordinates)
export const STAGE_Y: Record<string, number> = {
  // Chain 1: Primary Operating Cycle
  node_cus_1: -180,      // Customer (Urban Threads) placed directly above node_co_1
  node_sup_1: 70,        // Row 0: Supplier (Shree Textiles)
  node_pay_1: 70,        // Row 0: Advance payment
  node_po_1: 70,         // Row 0: Purchase order PO-1
  node_delivery_1: 70,   // Row 0: Inventory delivery Day 4
  node_stock_1: 70,      // Row 0: Inventory stock (12 units)
  node_co_1: 70,         // Row 0: Customer sale #CO-1
  node_inv_2001: 70,     // Row 0: Invoice INV-2001
  node_rec_2001: 70,     // Row 0: Customer receipt REC-2001

  node_pay_3: 360,       // Row 1: PO balance payment
  node_risk_1: 360,      // Row 1: Day 5 cash shortfall risk

  // Chain 2: Secondary cycle (Middle workflow lane)
  node_sup_2: 740,       // Row 2: Supplier (Mehta Fabrics)
  node_po_2: 740,        // Row 2: Purchase order PO-2
  node_delivery_2: 640,  // Row 2a: Upper delivery branch
  node_pay_po2: 920,     // Row 2b: Lower net-45 payment branch

  // Chain 3: Customer Receivables (Bottom workflow lane)
  node_cus_2: 1380,      // Row 3: Customer (Style Mart)
  node_inv_1999: 1240,   // Row 3a: Upper overdue invoice branch
  node_co_2: 1520,       // Row 3b: Lower customer sale branch
  node_inv_2002: 1520,   // Row 3b: Invoice INV-2002
  node_rec_2002: 1520,   // Row 3b: Customer receipt REC-2002
};

// Exact ER Diagram Port / Handle Mappings to eliminate all edge overlaps
export const EDGE_HANDLES: Record<string, { sourceHandle: string; targetHandle: string }> = {
  // Chain 1: Primary Operating Cycle
  edge_sup_to_adv: { sourceHandle: "right", targetHandle: "left" },
  edge_adv_to_po: { sourceHandle: "right", targetHandle: "left" },
  edge_po_to_deliv: { sourceHandle: "right-upper", targetHandle: "left" },
  edge_po_to_balpay: { sourceHandle: "right-lower", targetHandle: "left" },
  edge_deliv_to_stock: { sourceHandle: "right", targetHandle: "left" },
  edge_deliv_to_risk: { sourceHandle: "bottom", targetHandle: "top" },
  edge_pay3_to_risk: { sourceHandle: "right", targetHandle: "left" },
  edge_stock_to_co: { sourceHandle: "right", targetHandle: "left" },
  edge_cus_to_co: { sourceHandle: "bottom", targetHandle: "top" },
  edge_co_to_inv: { sourceHandle: "right", targetHandle: "left" },
  edge_inv_to_rec: { sourceHandle: "right", targetHandle: "left" },

  // Chain 2: Secondary Cycle (Mehta Fabrics)
  edge_sup2_to_po2: { sourceHandle: "right", targetHandle: "left" },
  edge_po2_to_deliv2: { sourceHandle: "right-upper", targetHandle: "left" },
  edge_po2_to_pay: { sourceHandle: "right-lower", targetHandle: "left" },

  // Chain 3: Customer Receivables (Style Mart)
  edge_cus2_to_inv1999: { sourceHandle: "right-upper", targetHandle: "left" },
  edge_cus2_to_co2: { sourceHandle: "right-lower", targetHandle: "left" },
  edge_co2_to_inv2002: { sourceHandle: "right", targetHandle: "left" },
  edge_inv2002_to_rec2002: { sourceHandle: "right", targetHandle: "left" },
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
      const x = STAGE_X[node.id] ?? 80 + (index % 5) * 320;
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

  // Lane Header Annotations for structured swimlanes
  const laneNodes: Node<any>[] = [
    {
      id: "lane_1",
      type: "lane_header",
      position: { x: 60, y: -260 },
      data: {
        title: "Chain 1: Primary Operating Cycle",
        subtitle: "Shree Textiles → Fabrication → Urban Threads Boutique · Risk Point Day 5",
        badge: "Critical Path",
        badgeVariant: "destructive",
      },
      selectable: false,
      draggable: false,
    },
    {
      id: "lane_2",
      type: "lane_header",
      position: { x: 60, y: 570 },
      data: {
        title: "Chain 2: Secondary Procurement",
        subtitle: "Mehta Fabrics → Linen Shirt PO-2 & Day 11 Delivery · Net-45 Terms",
        badge: "Active Restock",
        badgeVariant: "secondary",
      },
      selectable: false,
      draggable: false,
    },
    {
      id: "lane_3",
      type: "lane_header",
      position: { x: 60, y: 1150 },
      data: {
        title: "Chain 3: Receivables & Collections",
        subtitle: "Style Mart → Overdue INV-1999 Collection & Day 39 Settlement",
        badge: "Overdue Attention",
        badgeVariant: "warning",
      },
      selectable: false,
      draggable: false,
    },
  ];

  const allNodes =
    filteredNodeIds && filteredNodeIds.size < data.nodes.length
      ? nodes
      : [...laneNodes, ...nodes];

  // Transform Edges
  const validNodeIds = new Set(nodes.map((n) => n.id));

  const edges: Edge[] = data.edges
    .filter((e) => validNodeIds.has(e.source) && validNodeIds.has(e.target))
    .map((edge) => {
      const isHighlighted = highlightedEdgeIds.has(edge.id);
      const isDimmed = isSelectionActive && !isHighlighted;
      const isAtRisk = edge.status === "at_risk";
      const isDelayed = edge.status === "delayed";
      const shouldShowLabel = isHighlighted || isAtRisk || isDelayed;

      const handles = EDGE_HANDLES[edge.id] || {
        sourceHandle: "right",
        targetHandle: "left",
      };

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: "custom",
        data: {
          description: edge.description,
          isHighlighted,
          isAtRisk,
          isDelayed,
          isDimmed,
          status: edge.status,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 13,
          height: 13,
          color: isHighlighted
            ? "var(--primary)"
            : isAtRisk
              ? "var(--warning)"
              : isDelayed
                ? "var(--destructive)"
                : "var(--muted-foreground)",
        },
      };
    });

  return { nodes: allNodes, edges };
}
