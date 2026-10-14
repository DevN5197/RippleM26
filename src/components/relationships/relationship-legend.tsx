import React, { useState } from "react";
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
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function RelationshipLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-card/95 p-3 text-xs shadow-xs backdrop-blur-sm transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Info className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span>Graph Legend</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              Hide <ChevronUp className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              Explore types <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3 pt-2 border-t border-border/60 animate-in fade-in-50 duration-150">
          {/* Node Types Grid */}
          <div>
            <p className="font-semibold text-muted-foreground text-[11px] mb-2 uppercase tracking-wide">
              Entity & Event Nodes
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-primary/10 text-primary">
                  <Truck className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Supplier</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-chart-5/10 text-chart-5">
                  <CreditCard className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Supplier Payment</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-primary/10 text-primary">
                  <Package className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Purchase Order</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-chart-2/15 text-chart-2">
                  <Boxes className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Inventory Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-warning/15 text-warning-foreground">
                  <Layers className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Inventory Stock</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-primary/10 text-primary">
                  <Users className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Customer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-chart-1/10 text-chart-1">
                  <ShoppingCart className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Customer Sale</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-chart-1/10 text-chart-1">
                  <FileText className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Customer Invoice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-success/15 text-success">
                  <ArrowDownToLine className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Expected Receipt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">Cash-flow Risk</span>
              </div>
            </div>
          </div>

          {/* Status & Connection indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
            <div>
              <p className="font-semibold text-muted-foreground text-[11px] mb-1.5 uppercase tracking-wide">
                Statuses
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                  ● Completed
                </span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  ● Upcoming
                </span>
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                  ● Delayed
                </span>
                <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
                  ▲ At Risk
                </span>
              </div>
            </div>

            <div>
              <p className="font-semibold text-muted-foreground text-[11px] mb-1.5 uppercase tracking-wide">
                Dependency Edges
              </p>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 bg-primary" />
                  <span>Directional dependency & milestone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 bg-warning border-dashed" />
                  <span>Potential risk cascade / cash shortfall</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
