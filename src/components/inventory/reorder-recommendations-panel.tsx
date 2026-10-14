import React from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ShoppingCart,
  Eye,
  Building2,
  Calendar,
  FlaskConical,
  Truck,
  CheckCircle2,
  Info,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatMoney, formatDate } from "@/lib/formatters";
import type { ReorderRecommendation } from "@/types";

interface ReorderRecommendationsPanelProps {
  recommendations: ReorderRecommendation[];
  isLoading: boolean;
  onSelectProduct: (productId: string) => void;
  onCreatePurchaseOrder: (productId: string, supplierId?: string) => void;
}

export function ReorderRecommendationsPanel({
  recommendations,
  isLoading,
  onSelectProduct,
  onCreatePurchaseOrder,
}: ReorderRecommendationsPanelProps) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">All Stock Levels Healthy</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
          No replenishment orders are currently required. Warehouse stock buffers and incoming
          deliveries comfortably exceed reorder thresholds and committed customer orders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informational Guidance Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-xs">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Info className="h-4 w-4 text-primary" />
          Algorithmic Procurement & Lead-Time Sizing
        </div>
        <p className="mt-1 text-muted-foreground leading-relaxed">
          Recommendations synthesize current available stock, open customer reservations, supplier
          lead times, and minimum reorder thresholds.{" "}
          <span className="font-medium text-foreground">
            Confirmed facts are clearly separated from proposed purchase suggestions.
          </span>
        </p>
      </div>

      <div className="grid gap-4">
        {recommendations.map((rec) => (
          <Card key={rec.productId} className="shadow-xs border-l-4 border-l-warning">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-foreground">
                      {rec.productName}
                    </CardTitle>
                    <span className="font-mono text-xs text-muted-foreground uppercase">
                      {rec.sku}
                    </span>
                    {rec.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {rec.category}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-1 text-warning-foreground font-medium">
                    {rec.reason}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectProduct(rec.productId)}
                    className="h-8 text-xs gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Product
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onCreatePurchaseOrder(rec.productId, rec.preferredSupplierId)}
                    className="h-8 text-xs gap-1.5 shadow-xs"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" /> Create Purchase Order
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-3">
              {/* Confirmed Facts vs Proposed Order Comparison */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* Fact: Current Available */}
                <div className="rounded border bg-muted/20 p-2.5">
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Confirmed Available
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {rec.currentAvailableStock}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / {rec.reorderPoint} threshold
                    </span>
                  </span>
                </div>

                {/* Fact: Incoming Quantity */}
                <div className="rounded border bg-muted/20 p-2.5">
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Incoming Deliveries
                  </span>
                  <span className="text-base font-bold text-primary">
                    {rec.incomingQuantity > 0 ? `+${rec.incomingQuantity}` : "0"} units
                  </span>
                </div>

                {/* Proposed: Suggested Reorder Quantity */}
                <div className="rounded border border-primary/30 bg-primary/5 p-2.5">
                  <span className="text-[10px] text-primary block font-semibold">
                    Suggested Reorder
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {rec.suggestedReorderQuantity} units
                  </span>
                </div>

                {/* Proposed: Purchase Amount */}
                <div className="rounded border border-primary/30 bg-primary/5 p-2.5">
                  <span className="text-[10px] text-primary block font-semibold">
                    Proposed Outlay
                  </span>
                  <span className="text-base font-bold text-foreground font-mono">
                    {rec.proposedPurchaseAmountPaise
                      ? formatMoney(rec.proposedPurchaseAmountPaise)
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Timing, Supplier & Customer Risk Details */}
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">
                      Preferred Supplier
                    </span>
                    <span className="font-semibold text-foreground">
                      {rec.preferredSupplierName ? (
                        <Link to="/suppliers" className="text-primary hover:underline">
                          {rec.preferredSupplierName} ({rec.preferredSupplierLeadDays || 15}d lead)
                        </Link>
                      ) : (
                        "No preferred supplier assigned"
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block">
                      Estimated Delivery Date
                    </span>
                    <span className="font-semibold text-foreground">
                      {rec.estimatedDeliveryDate
                        ? formatDate(rec.estimatedDeliveryDate, "d MMM yyyy")
                        : "Depends on supplier order date"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block">
                      Required Upfront Advance
                    </span>
                    <span className="font-semibold text-foreground font-mono">
                      {rec.requiredAdvancePaise ? formatMoney(rec.requiredAdvancePaise) : "₹0"}
                    </span>
                  </div>
                </div>

                {/* Customer commitments at risk */}
                {rec.customerCommitmentsAtRisk.length > 0 && (
                  <div className="pt-2 border-t border-muted">
                    <span className="text-[11px] font-semibold text-destructive block">
                      Customer Commitments at Risk:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {rec.customerCommitmentsAtRisk.map((c, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="border-destructive/30 bg-destructive/5 text-destructive text-[11px]"
                        >
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ripple Simulator Link */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Simulate procurement cash outlays against future receivable collections:
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-6 text-[11px] gap-1 text-primary"
                >
                  <Link
                    to="/simulator"
                    search={{
                      eventId: `node_stock_1`,
                      eventName: `${rec.productName} Reorder`,
                    }}
                  >
                    <FlaskConical className="h-3 w-3" /> Explore in Simulator
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
