import React from "react";
import { Package, Boxes, AlertTriangle, AlertCircle, Truck, IndianRupee, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-3">
      {/* Group header or grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* ============================================================ */}
        {/* DATA BOXES FIRST (Primary metrics & physical stock status)  */}
        {/* ============================================================ */}

        {/* 1. Total distinct products */}
        <Card className="shadow-xs border-border/80 bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total products</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
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
        <Card className="shadow-xs border-border/80 bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Available units</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-success/10 text-success">
                <Boxes className="h-4 w-4" aria-hidden />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {metrics.totalAvailableUnits}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">On hand − reserved</p>
          </CardContent>
        </Card>

        {/* 3. Estimated inventory value */}
        <Card className="shadow-xs border-border/80 bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Estimated value</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
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

        {/* ============================================================ */}
        {/* CLICKABLE / ACTIONABLE FILTER BOXES (Interactive styling)    */}
        {/* ============================================================ */}

        {/* 4. Low-stock items */}
        <Card
          className={cn(
            "transition-all cursor-pointer hover:border-warning/70 hover:shadow-sm border-dashed",
            isLowStockActive
              ? "border-warning border-solid ring-2 ring-warning/30 bg-warning/10"
              : "bg-warning/5 border-warning/40 hover:bg-warning/10",
          )}
          onClick={() => onSelectStatusFilter(isLowStockActive ? "all" : "low_stock")}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-warning-foreground">Low-stock items</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1 py-0 h-4 uppercase font-semibold",
                    isLowStockActive
                      ? "bg-warning text-warning-foreground border-warning"
                      : "border-warning/30 text-warning-foreground bg-warning/20",
                  )}
                >
                  {isLowStockActive ? "Active" : "Filter"}
                </Badge>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-warning/20 text-warning-foreground">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-warning-foreground">
                {metrics.lowStockCount}
              </span>
              {metrics.lowStockCount > 0 && (
                <span className="text-[11px] font-medium text-warning-foreground">Needs restock</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isLowStockActive ? "Tap to clear filter" : "Tap to filter low stock"}
            </p>
          </CardContent>
        </Card>

        {/* 5. Items with projected stockouts */}
        <Card
          className={cn(
            "transition-all cursor-pointer hover:border-destructive/70 hover:shadow-sm border-dashed",
            isStockoutRiskActive
              ? "border-destructive border-solid ring-2 ring-destructive/30 bg-destructive/10"
              : "bg-destructive/5 border-destructive/40 hover:bg-destructive/10",
          )}
          onClick={() => onSelectStatusFilter(isStockoutRiskActive ? "all" : "stockout_risk")}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-destructive">Stockout risk</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1 py-0 h-4 uppercase font-semibold",
                    isStockoutRiskActive
                      ? "bg-destructive text-destructive-foreground border-destructive"
                      : "border-destructive/30 text-destructive bg-destructive/20",
                  )}
                >
                  {isStockoutRiskActive ? "Active" : "Filter"}
                </Badge>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/20 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-destructive">
                {metrics.stockoutRiskCount}
              </span>
              {metrics.stockoutRiskCount > 0 && (
                <span className="text-[11px] font-medium text-destructive">Shortage risk</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isStockoutRiskActive ? "Tap to clear filter" : "Tap to filter at-risk items"}
            </p>
          </CardContent>
        </Card>

        {/* 6. Incoming purchase-order units */}
        <Card
          className={cn(
            "transition-all cursor-pointer hover:border-primary/70 hover:shadow-sm border-dashed",
            isIncomingActive
              ? "border-primary border-solid ring-2 ring-primary/30 bg-primary/10"
              : "bg-primary/5 border-primary/40 hover:bg-primary/10",
          )}
          onClick={() => {
            if (onNavigateToPurchaseOrders) {
              onNavigateToPurchaseOrders();
            } else {
              onSelectStatusFilter(isIncomingActive ? "all" : "incoming_stock");
            }
          }}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-primary">Incoming units</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1 py-0 h-4 uppercase font-semibold",
                    isIncomingActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-primary/30 text-primary bg-primary/20",
                  )}
                >
                  {isIncomingActive ? "Active" : "PO View"}
                </Badge>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20 text-primary">
                <Truck className="h-3.5 w-3.5" aria-hidden />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-primary">
              {metrics.incomingUnits}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">From open purchase orders</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
