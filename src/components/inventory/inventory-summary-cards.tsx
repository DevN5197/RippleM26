import React from "react";
import {
  Package,
  Boxes,
  AlertTriangle,
  AlertCircle,
  Truck,
  IndianRupee,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { InventorySummaryMetrics, StockStatus } from "@/types";

interface InventorySummaryCardsProps {
  metrics: InventorySummaryMetrics;
  activeStatusFilter: StockStatus | "all";
  onSelectStatusFilter: (status: StockStatus | "all") => void;
  onNavigateToPurchaseOrders?: () => void;
}

export function InventorySummaryCards({
  metrics,
  activeStatusFilter,
  onSelectStatusFilter,
  onNavigateToPurchaseOrders,
}: InventorySummaryCardsProps) {
  const isLowStockActive = activeStatusFilter === "low_stock";
  const isStockoutRiskActive = activeStatusFilter === "stockout_risk";
  const isIncomingActive = activeStatusFilter === "incoming_stock";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* 1. Total distinct products */}
      <Card
        className={cn(
          "transition-all cursor-pointer hover:border-primary/50 shadow-xs",
          activeStatusFilter === "all" ? "border-primary/30 ring-1 ring-primary/20" : "",
        )}
        onClick={() => onSelectStatusFilter("all")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total products</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Package className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {metrics.totalProducts}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Active catalog SKUs</p>
        </CardContent>
      </Card>

      {/* 2. Total units available */}
      <Card className="shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Available units</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10 text-success">
              <Boxes className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {metrics.totalAvailableUnits}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">On hand − reserved</p>
        </CardContent>
      </Card>

      {/* 3. Low-stock items */}
      <Card
        className={cn(
          "transition-all cursor-pointer hover:border-warning/70 shadow-xs",
          isLowStockActive ? "border-warning ring-2 ring-warning/30 bg-warning/5" : "",
        )}
        onClick={() => onSelectStatusFilter(isLowStockActive ? "all" : "low_stock")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Low-stock items</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/15 text-warning-foreground">
              <AlertTriangle className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {metrics.lowStockCount}
            </span>
            {metrics.lowStockCount > 0 && (
              <span className="text-[11px] font-medium text-warning-foreground">Needs restock</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isLowStockActive ? "Click to reset filter" : "Click to filter table"}
          </p>
        </CardContent>
      </Card>

      {/* 4. Items with projected stockouts */}
      <Card
        className={cn(
          "transition-all cursor-pointer hover:border-destructive/70 shadow-xs",
          isStockoutRiskActive ? "border-destructive ring-2 ring-destructive/30 bg-destructive/5" : "",
        )}
        onClick={() => onSelectStatusFilter(isStockoutRiskActive ? "all" : "stockout_risk")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Stockout risk</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {metrics.stockoutRiskCount}
            </span>
            {metrics.stockoutRiskCount > 0 && (
              <span className="text-[11px] font-medium text-destructive">Demand &gt; stock</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isStockoutRiskActive ? "Click to reset filter" : "Click to filter table"}
          </p>
        </CardContent>
      </Card>

      {/* 5. Incoming purchase-order units */}
      <Card
        className={cn(
          "transition-all cursor-pointer hover:border-primary/70 shadow-xs",
          isIncomingActive ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "",
        )}
        onClick={() => {
          if (onNavigateToPurchaseOrders) {
            onNavigateToPurchaseOrders();
          } else {
            onSelectStatusFilter(isIncomingActive ? "all" : "incoming_stock");
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Incoming units</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Truck className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {metrics.incomingUnits}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">From open purchase orders</p>
        </CardContent>
      </Card>

      {/* 6. Estimated inventory value */}
      <Card className="shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Estimated value</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <IndianRupee className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {metrics.estimatedValuationPaise !== undefined
              ? formatMoney(metrics.estimatedValuationPaise)
              : "—"}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Stock on hand × unit cost</p>
        </CardContent>
      </Card>
    </div>
  );
}
