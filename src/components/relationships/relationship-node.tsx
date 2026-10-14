import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Truck,
  CreditCard,
  Package,
  Boxes,
  Layers,
  Users,
  ShoppingCart,
  FileText,
  ArrowDownToLine,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoneyCompact, formatDate } from "@/lib/formatters";
import type { RelationshipGraphNode, RelationshipNodeType } from "@/types";

export interface CustomNodeData extends Record<string, unknown> {
  node: RelationshipGraphNode;
  isSelected?: boolean | undefined;
  isUpstream?: boolean | undefined;
  isDownstream?: boolean | undefined;
  isDimmed?: boolean | undefined;
}

const typeConfig: Record<
  RelationshipNodeType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
    badgeBg: string;
  }
> = {
  supplier: {
    label: "Supplier",
    icon: Truck,
    accentClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary",
  },
  supplier_payment: {
    label: "Supplier Payment",
    icon: CreditCard,
    accentClass: "text-chart-5",
    badgeBg: "bg-chart-5/10 text-chart-5",
  },
  purchase_order: {
    label: "Purchase Order",
    icon: Package,
    accentClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary",
  },
  inventory_delivery: {
    label: "Inventory Delivery",
    icon: Boxes,
    accentClass: "text-chart-2",
    badgeBg: "bg-chart-2/15 text-chart-2",
  },
  inventory_stock: {
    label: "Inventory Stock",
    icon: Layers,
    accentClass: "text-warning",
    badgeBg: "bg-warning/15 text-warning-foreground",
  },
  customer: {
    label: "Customer",
    icon: Users,
    accentClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary",
  },
  sale: {
    label: "Customer Sale",
    icon: ShoppingCart,
    accentClass: "text-chart-1",
    badgeBg: "bg-chart-1/10 text-chart-1",
  },
  customer_invoice: {
    label: "Customer Invoice",
    icon: FileText,
    accentClass: "text-chart-1",
    badgeBg: "bg-chart-1/10 text-chart-1",
  },
  expected_receipt: {
    label: "Expected Receipt",
    icon: ArrowDownToLine,
    accentClass: "text-success",
    badgeBg: "bg-success/15 text-success",
  },
  recorded_payment: {
    label: "Recorded Payment",
    icon: CheckCircle2,
    accentClass: "text-success",
    badgeBg: "bg-success/15 text-success",
  },
  cash_flow_risk: {
    label: "Cash-flow Risk",
    icon: AlertTriangle,
    accentClass: "text-destructive",
    badgeBg: "bg-destructive/10 text-destructive",
  },
};

export const RelationshipCustomNode = memo(({ data }: NodeProps) => {
  const customData = data as unknown as CustomNodeData;
  const node = customData?.node;

  if (!node) return null;

  const config = typeConfig[node.type] || typeConfig.supplier;
  const Icon = config.icon;
  const isSelected = customData.isSelected;
  const isUpstream = customData.isUpstream;
  const isDownstream = customData.isDownstream;
  const isDimmed = customData.isDimmed;

  const isCompleted = node.status === "completed";
  const isDelayed = node.status === "delayed";
  const isAtRisk = node.status === "at_risk";
  const isUpcoming = node.status === "upcoming";

  return (
    <div
      className={cn(
        "group relative flex w-[260px] flex-col rounded-xl border bg-card p-3.5 text-card-foreground shadow-xs transition-all duration-200 select-none",
        isSelected
          ? "border-primary ring-2 ring-primary/40 shadow-md translate-y-[-2px]"
          : isUpstream
            ? "border-primary/70 ring-2 ring-primary/20 shadow-xs"
            : isDownstream
              ? "border-warning/80 ring-2 ring-warning/25 shadow-xs"
              : "border-border hover:border-primary/40 hover:shadow-xs",
        isDimmed && "opacity-35 grayscale-[20%]",
      )}
    >
      {/* React Flow Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-card !bg-primary transition-colors",
          isSelected && "!bg-primary !h-3.5 !w-3.5",
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-card !bg-primary transition-colors",
          isSelected && "!bg-primary !h-3.5 !w-3.5",
        )}
      />

      {/* Dependency role pill if active */}
      {isUpstream && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-xs">
          Upstream Dependency
        </span>
      )}
      {isDownstream && (
        <span className="absolute -top-2.5 right-4 rounded-full bg-warning px-2 py-0.5 text-[10px] font-semibold text-warning-foreground shadow-xs">
          Downstream Impact
        </span>
      )}

      {/* Card Header: Type Badge + Status Indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
              config.badgeBg,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {config.label}
          </span>
        </div>

        {/* Status Pill with icon */}
        <div className="flex items-center shrink-0">
          {isCompleted && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success"
              title="Event completed"
            >
              <CheckCircle2 className="h-3 w-3" />
              Done
            </span>
          )}
          {isUpcoming && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
              title="Upcoming event"
            >
              <Clock className="h-3 w-3" />
              Upcoming
            </span>
          )}
          {isDelayed && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive"
              title="Delayed event"
            >
              <AlertCircle className="h-3 w-3" />
              Delayed
            </span>
          )}
          {isAtRisk && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning-foreground"
              title="Potential cash-flow risk"
            >
              <AlertTriangle className="h-3 w-3" />
              At Risk
            </span>
          )}
          {node.status === "active" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Main Node Label */}
      <div className="mt-2.5">
        <h4 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {node.label}
        </h4>
        {node.metadata.partnerName && (
          <p className="truncate text-xs text-muted-foreground mt-0.5">
            {node.metadata.partnerName}
          </p>
        )}
      </div>

      {/* Metrics Row (Date / Amount) */}
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
        <div className="min-w-0">
          {node.date ? (
            <span className="text-muted-foreground font-medium">
              {formatDate(node.date, "d MMM")}
            </span>
          ) : (
            <span className="text-muted-foreground text-[11px]">
              {node.metadata.expectedDate || "Current"}
            </span>
          )}
        </div>

        {node.amountPaise !== undefined && node.amountPaise > 0 ? (
          <span
            className={cn(
              "font-semibold tabular-nums",
              node.metadata.cashDirection === "incoming"
                ? "text-success"
                : node.metadata.cashDirection === "outgoing"
                  ? "text-destructive"
                  : "text-foreground",
            )}
          >
            {node.metadata.cashDirection === "outgoing" ? "−" : ""}
            {formatMoneyCompact(node.amountPaise)}
          </span>
        ) : node.metadata.quantity !== undefined ? (
          <span className="font-medium text-muted-foreground tabular-nums">
            {node.metadata.quantity} units
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Touchpoint</span>
        )}
      </div>
    </div>
  );
});

RelationshipCustomNode.displayName = "RelationshipCustomNode";
