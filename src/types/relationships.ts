import type { CurrencyCode, RiskSeverity } from "./index";

export type RelationshipNodeType =
  | "supplier"
  | "supplier_payment"
  | "purchase_order"
  | "inventory_delivery"
  | "inventory_stock"
  | "customer"
  | "sale"
  | "customer_invoice"
  | "expected_receipt"
  | "recorded_payment"
  | "cash_flow_risk";

export type RelationshipNodeStatus =
  "completed" | "upcoming" | "delayed" | "at_risk" | "active" | "draft";

export interface RelationshipNodeMetadata {
  entityType: string;
  referenceNumber?: string | undefined;
  partnerName?: string | undefined;
  partnerType?: "supplier" | "customer" | undefined;
  sku?: string | undefined;
  productName?: string | undefined;
  quantity?: number | undefined;
  expectedDate?: string | undefined;
  actualDate?: string | undefined;
  lagDays?: number | undefined;
  riskSeverity?: RiskSeverity | undefined;
  riskDescription?: string | undefined;
  workflowSignificance: string;
  cashImpactPaise?: number | undefined;
  cashDirection?: "incoming" | "outgoing" | undefined;
  nextMilestone?: string | undefined;
}

export interface RelationshipGraphNode {
  id: string;
  type: RelationshipNodeType;
  label: string;
  status: RelationshipNodeStatus;
  date?: string | undefined;
  amountPaise?: number | undefined;
  currency: CurrencyCode;
  entityId: string;
  metadata: RelationshipNodeMetadata;
}

export type RelationshipEdgeType =
  | "fulfills"
  | "triggers"
  | "delivers_to"
  | "supplies_stock"
  | "sold_to"
  | "billed_as"
  | "settled_by"
  | "threatens"
  | "depends_on";

export interface RelationshipGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: RelationshipEdgeType;
  status: "active" | "completed" | "delayed" | "at_risk";
  description: string;
  lagDays?: number | undefined;
}

export interface RippleMilestone {
  nodeId: string;
  label: string;
  type: RelationshipNodeType;
  date?: string | undefined;
  daysFromSelected: number;
  status: RelationshipNodeStatus;
  amountPaise?: number | undefined;
  consequence: string;
}

export interface RippleImpactPreview {
  selectedNodeId: string;
  selectedLabel: string;
  primaryMilestone: string;
  cashFlowRisk: {
    hasRisk: boolean;
    description?: string | undefined;
    severity?: RiskSeverity | undefined;
    shortfallPaise?: number | undefined;
  };
  chain: RippleMilestone[];
  businessImpactSummary: string;
}

export interface RelationshipGraphSummary {
  totalNodes: number;
  totalEdges: number;
  atRiskCount: number;
  upcomingCount: number;
  totalCashAtRiskPaise: number;
  dateWindowDays: number;
}

export interface RelationshipGraphData {
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
  summary: RelationshipGraphSummary;
  updatedAt: string;
}

export interface RelationshipFilterParams {
  search?: string | undefined;
  nodeTypes?: RelationshipNodeType[] | undefined;
  statuses?: RelationshipNodeStatus[] | undefined;
  timeframe?: "all" | "past" | "next7" | "next30" | undefined;
  partnerId?: string | undefined;
  riskOnly?: boolean | undefined;
}
