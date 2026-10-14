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
        "group relative flex w-[270px] flex-col rounded-xl border bg-card text-card-foreground shadow-xs transition-all duration-200 select-none cursor-pointer overflow-visible",
        isSelected
          ? "border-primary ring-2 ring-primary/60 shadow-lg -translate-y-0.5 bg-card ring-offset-2 ring-offset-background"
          : isUpstream
            ? "border-primary/80 ring-2 ring-primary/25 shadow-sm bg-primary/[0.02]"
            : isDownstream
              ? "border-warning/90 ring-2 ring-warning/30 shadow-sm bg-warning/[0.02]"
              : isAtRisk
                ? "border-warning/60 hover:border-warning shadow-xs"
                : isDelayed
                  ? "border-destructive/60 hover:border-destructive shadow-xs"
                  : "border-border hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5",
        isDimmed && "opacity-60",
      )}
    >
      {/* React Flow ER Multi-Handles */}
      {/* Left Input Handles */}
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{ top: "50%" }}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground/60 transition-all hover:!scale-125",
          (isSelected || isUpstream) && "!bg-primary !h-3 !w-3",
          isDownstream && "!bg-warning !h-3 !w-3",
        )}
      />
      <Handle
        id="left-upper"
        type="target"
        position={Position.Left}
        style={{ top: "30%" }}
        className={cn(
          "!h-2 !w-2 !border-2 !border-background !bg-muted-foreground/50 transition-all hover:!scale-125",
          (isSelected || isUpstream) && "!bg-primary !h-2.5 !w-2.5",
          isDownstream && "!bg-warning !h-2.5 !w-2.5",
        )}
      />
      <Handle
        id="left-lower"
        type="target"
        position={Position.Left}
        style={{ top: "70%" }}
        className={cn(
          "!h-2 !w-2 !border-2 !border-background !bg-muted-foreground/50 transition-all hover:!scale-125",
          (isSelected || isUpstream) && "!bg-primary !h-2.5 !w-2.5",
          isDownstream && "!bg-warning !h-2.5 !w-2.5",
        )}
      />

      {/* Right Output Handles */}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{ top: "50%" }}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground/60 transition-all hover:!scale-125",
          (isSelected || isUpstream) && "!bg-primary !h-3 !w-3",
          isDownstream && "!bg-warning !h-3 !w-3",
        )}
      />
      <Handle
        id="right-upper"
        type="source"
        position={Position.Right}
        style={{ top: "30%" }}
        className={cn(
          "!h-2 !w-2 !border-2 !border-background !bg-muted-foreground/50 transition-all hover:!scale-125",
          (isSelected || isUpstream) && "!bg-primary !h-2.5 !w-2.5",
          isDownstream && "!bg-warning !h-2.5 !w-2.5",
        )}
      />
      <Handle
        id="right-lower"
        type="source"
        position={Position.Right}
        style={{ top: "70%" }}
        className={cn(
          "!h-2 !w-2 !border-2 !border-background !bg-muted-foreground/50 transition-all hover:!scale-125",
          (isSelected || isUpstream) && "!bg-primary !h-2.5 !w-2.5",
          isDownstream && "!bg-warning !h-2.5 !w-2.5",
        )}
      />

      {/* Top Input Handle */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        style={{ left: "50%" }}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground/60 transition-all hover:!scale-125",
          (isSelected || isUpstream) && "!bg-primary !h-3 !w-3",
          isDownstream && "!bg-warning !h-3 !w-3",
        )}
      />

      {/* Bottom Output Handle */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        style={{ left: "50%" }}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground/60 transition-all hover:!scale-125",
          (isSelected || isUpstream) && "!bg-primary !h-3 !w-3",
          isDownstream && "!bg-warning !h-3 !w-3",
        )}
      />

      {/* Dependency role pill if active */}
      {isUpstream && (
        <span className="absolute -top-3 left-4 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-xs tracking-wide uppercase">
          Upstream
        </span>
      )}
      {isDownstream && (
        <span className="absolute -top-3 right-4 rounded-full bg-warning px-2 py-0.5 text-[9px] font-bold text-warning-foreground shadow-xs tracking-wide uppercase">
          Downstream
        </span>
      )}

      {/* ER Card Header Banner */}
      <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-3.5 py-2 rounded-t-xl">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
              config.badgeBg,
            )}
          >
            <Icon className="h-3 w-3" />
          </span>
          <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            {config.label}
          </span>
        </div>

        {/* Status Pill or Reference ID */}
        <div className="flex items-center shrink-0">
          {isCompleted && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success"
              title="Event completed"
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              Done
            </span>
          )}
          {isUpcoming && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
              title="Upcoming event"
            >
              <Clock className="h-2.5 w-2.5" />
              Upcoming
            </span>
          )}
          {isDelayed && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive"
              title="Delayed event"
            >
              <AlertCircle className="h-2.5 w-2.5" />
              Delayed
            </span>
          )}
          {isAtRisk && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground"
              title="Potential cash-flow risk"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              At Risk
            </span>
          )}
          {node.status === "active" && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
              Active
            </span>
          )}
        </div>
      </div>

      {/* ER Entity Body */}
      <div className="px-3.5 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {node.label}
          </h4>
        </div>
        {node.metadata.partnerName && (
          <p className="truncate text-xs text-muted-foreground mt-0.5">
            {node.metadata.partnerName}
          </p>
        )}
      </div>

      {/* ER Attributes Row (Date / Financial Amount / Quantity) */}
      <div className="border-t border-border/60 bg-muted/15 px-3.5 py-2 flex items-center justify-between text-xs rounded-b-xl">
        <div className="min-w-0">
          {node.date ? (
            <span className="text-muted-foreground font-medium font-mono text-[11px]">
              {formatDate(node.date, "d MMM yyyy")}
            </span>
          ) : (
            <span className="text-muted-foreground font-mono text-[11px]">
              {node.metadata.expectedDate || "Standard"}
            </span>
          )}
        </div>

        {node.amountPaise !== undefined && node.amountPaise > 0 ? (
          <span
            className={cn(
              "font-semibold tabular-nums font-mono text-xs",
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
          <span className="font-semibold text-muted-foreground tabular-nums font-mono text-xs">
            {node.metadata.quantity} units
          </span>
        ) : node.metadata.referenceNumber ? (
          <span className="font-mono text-[11px] text-muted-foreground">
            {node.metadata.referenceNumber}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Entity</span>
        )}
      </div>
    </div>
  );
});

RelationshipCustomNode.displayName = "RelationshipCustomNode";

export interface LaneHeaderData extends Record<string, unknown> {
  title: string;
  subtitle: string;
  badge: string;
  badgeVariant?: "destructive" | "warning" | "secondary" | "default";
}

export const LaneHeaderNode = memo(({ data }: NodeProps) => {
  const lane = data as unknown as LaneHeaderData;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/90 backdrop-blur-xs px-4 py-2 shadow-2xs select-none pointer-events-none">
      <div className="flex h-2.5 w-2.5 rounded-full bg-primary" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-foreground tracking-wide uppercase">
          {lane.title}
        </span>
        <span className="text-muted-foreground/40 font-light">|</span>
        <span className="text-xs text-muted-foreground font-medium">
          {lane.subtitle}
        </span>
      </div>
      <span
        className={cn(
          "ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide",
          lane.badgeVariant === "destructive"
            ? "bg-destructive/15 text-destructive"
            : lane.badgeVariant === "warning"
              ? "bg-warning/20 text-warning-foreground"
              : "bg-primary/10 text-primary",
        )}
      >
        {lane.badge}
      </span>
    </div>
  );
});

LaneHeaderNode.displayName = "LaneHeaderNode";
