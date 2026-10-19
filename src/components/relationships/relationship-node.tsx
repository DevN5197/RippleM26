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
    accentClass: "text-indigo-400",
    badgeBg: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  },
  supplier_payment: {
    label: "Supplier Payment",
    icon: CreditCard,
    accentClass: "text-sky-400",
    badgeBg: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  },
  purchase_order: {
    label: "Purchase Order",
    icon: Package,
    accentClass: "text-blue-400",
    badgeBg: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  },
  inventory_delivery: {
    label: "Inventory Delivery",
    icon: Boxes,
    accentClass: "text-teal-400",
    badgeBg: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  },
  inventory_stock: {
    label: "Inventory Stock",
    icon: Layers,
    accentClass: "text-amber-400",
    badgeBg: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  },
  customer: {
    label: "Customer",
    icon: Users,
    accentClass: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  },
  sale: {
    label: "Customer Sale",
    icon: ShoppingCart,
    accentClass: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  },
  customer_invoice: {
    label: "Customer Invoice",
    icon: FileText,
    accentClass: "text-cyan-400",
    badgeBg: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  },
  expected_receipt: {
    label: "Expected Receipt",
    icon: ArrowDownToLine,
    accentClass: "text-emerald-400",
    badgeBg: "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40",
  },
  recorded_payment: {
    label: "Recorded Payment",
    icon: CheckCircle2,
    accentClass: "text-emerald-400",
    badgeBg: "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40",
  },
  cash_flow_risk: {
    label: "Cash-flow Risk",
    icon: AlertTriangle,
    accentClass: "text-rose-400",
    badgeBg: "bg-rose-500/25 text-rose-300 border border-rose-500/40",
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
        "group relative flex w-[270px] flex-col rounded-xl border bg-[#111115] text-white shadow-md transition-all duration-200 select-none cursor-pointer overflow-visible",
        isSelected
          ? "border-white ring-2 ring-white/60 shadow-xl -translate-y-0.5 bg-[#16161b] ring-offset-2 ring-offset-black"
          : isUpstream
            ? "border-emerald-400 ring-2 ring-emerald-400/30 shadow-md bg-[#121816]"
            : isDownstream
              ? "border-amber-400 ring-2 ring-amber-400/35 shadow-md bg-[#191610]"
              : isAtRisk
                ? "border-amber-500/80 hover:border-amber-400 shadow-sm"
                : isDelayed
                  ? "border-rose-500/80 hover:border-rose-400 shadow-sm"
                  : "border-white/20 hover:border-white/50 hover:shadow-lg hover:-translate-y-0.5",
        isDimmed && "opacity-45",
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
        <span className="absolute -top-3 right-4 rounded-full bg-warning px-2 py-0.5 text-[9px] font-bold text-zinc-950 shadow-xs tracking-wide uppercase">
          Downstream
        </span>
      )}

      {/* ER Card Header Banner */}
      <div className="flex items-center justify-between border-b border-white/15 bg-white/[0.06] px-3.5 py-2.5 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
              config.badgeBg,
            )}
          >
            <Icon className="h-3 w-3" />
          </span>
          <span className="truncate text-[11px] font-bold uppercase tracking-wider text-white/90 font-mono">
            {config.label}
          </span>
        </div>

        {/* Status Pill or Reference ID */}
        <div className="flex items-center shrink-0">
          {isCompleted && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
              title="Event completed"
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              Done
            </span>
          )}
          {isUpcoming && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-blue-500/25 border border-blue-500/40 px-2 py-0.5 text-[10px] font-semibold text-blue-300"
              title="Upcoming event"
            >
              <Clock className="h-2.5 w-2.5" />
              Upcoming
            </span>
          )}
          {isDelayed && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-rose-500/25 border border-rose-500/40 px-2 py-0.5 text-[10px] font-semibold text-rose-300"
              title="Delayed event"
            >
              <AlertCircle className="h-2.5 w-2.5" />
              Delayed
            </span>
          )}
          {isAtRisk && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
              title="Potential cash-flow risk"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              At Risk
            </span>
          )}
          {node.status === "active" && (
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
              Active
            </span>
          )}
        </div>
      </div>

      {/* ER Entity Body */}
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="truncate text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
            {node.label}
          </h4>
        </div>
        {node.metadata.partnerName && (
          <p className="truncate text-xs font-medium text-white/80 mt-1">
            {node.metadata.partnerName}
          </p>
        )}
      </div>

      {/* ER Attributes Row (Date / Financial Amount / Quantity) */}
      <div className="border-t border-white/12 bg-white/[0.04] px-3.5 py-2 flex items-center justify-between text-xs rounded-b-xl">
        <div className="min-w-0">
          {node.date ? (
            <span className="text-white/85 font-medium font-mono text-[11px]">
              {formatDate(node.date, "d MMM yyyy")}
            </span>
          ) : (
            <span className="text-white/85 font-mono text-[11px]">
              {node.metadata.expectedDate || "Standard"}
            </span>
          )}
        </div>

        {node.amountPaise !== undefined && node.amountPaise > 0 ? (
          <span
            className={cn(
              "font-bold tabular-nums font-mono text-xs",
              node.metadata.cashDirection === "incoming"
                ? "text-emerald-400"
                : node.metadata.cashDirection === "outgoing"
                  ? "text-rose-400"
                  : "text-white",
            )}
          >
            {node.metadata.cashDirection === "outgoing" ? "−" : ""}
            {formatMoneyCompact(node.amountPaise)}
          </span>
        ) : node.metadata.quantity !== undefined ? (
          <span className="font-semibold text-white/90 tabular-nums font-mono text-xs">
            {node.metadata.quantity} units
          </span>
        ) : node.metadata.referenceNumber ? (
          <span className="font-mono text-[11px] text-white/80">
            {node.metadata.referenceNumber}
          </span>
        ) : (
          <span className="text-[11px] text-white/80">Entity</span>
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
        <span className="text-xs text-muted-foreground font-medium">{lane.subtitle}</span>
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
