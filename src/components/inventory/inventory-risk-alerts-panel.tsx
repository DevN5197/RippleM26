import React from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  Eye,
  ShoppingCart,
  FlaskConical,
  Waves,
  Building2,
  Calendar,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import type { InventoryRiskAlert } from "@/types";

interface InventoryRiskAlertsPanelProps {
  alerts: InventoryRiskAlert[];
  isLoading: boolean;
  onSelectProduct: (productId: string) => void;
  onSelectPurchaseOrder?: (poId: string) => void;
}

export function InventoryRiskAlertsPanel({
  alerts,
  isLoading,
  onSelectProduct,
  onSelectPurchaseOrder,
}: InventoryRiskAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <Info className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          No Inventory Bottlenecks Detected
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
          Stock levels, supplier shipments, and committed customer delivery windows are aligned.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const isCritical = alert.severity === "critical";
        const isWarning = alert.severity === "warning";

        return (
          <Card
            key={alert.id}
            className={`shadow-xs transition-colors border-l-4 ${
              isCritical
                ? "border-l-destructive bg-destructive/5"
                : isWarning
                  ? "border-l-warning bg-warning/5"
                  : "border-l-primary bg-primary/5"
            }`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {isCritical ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : isWarning ? (
                      <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                    ) : (
                      <Info className="h-4 w-4 text-primary" />
                    )}

                    <span className="font-bold text-sm text-foreground">{alert.title}</span>

                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        isCritical
                          ? "border-destructive/30 text-destructive bg-destructive/10"
                          : isWarning
                            ? "border-warning/30 text-warning-foreground bg-warning/15"
                            : "border-primary/30 text-primary bg-primary/10"
                      }`}
                    >
                      {alert.severity}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                    {alert.explanation}
                  </p>
                </div>

                {alert.financialImpactPaise !== undefined && (
                  <div className="text-right sm:pl-4 whitespace-nowrap">
                    <span className="text-[10px] text-muted-foreground block">
                      Financial Exposure
                    </span>
                    <span className="text-xs font-bold text-foreground font-mono">
                      {formatMoney(alert.financialImpactPaise)}
                    </span>
                  </div>
                )}
              </div>

              {/* Counterparty & Date Context */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40 gap-2">
                <div className="flex items-center gap-3">
                  {alert.relevantDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Critical Date:{" "}
                      <span className="font-medium text-foreground">{alert.relevantDate}</span>
                    </span>
                  )}

                  {alert.supplierName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Supplier:{" "}
                      <span className="font-medium text-foreground">{alert.supplierName}</span>
                    </span>
                  )}

                  {alert.customerName && (
                    <span className="flex items-center gap-1">
                      Customer:{" "}
                      <span className="font-medium text-foreground">{alert.customerName}</span>
                    </span>
                  )}
                </div>

                {/* Meaningful Action Button */}
                <div className="flex items-center gap-2">
                  {alert.productId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectProduct(alert.productId!)}
                      className="h-7 text-xs gap-1"
                    >
                      <Eye className="h-3 w-3" /> View Product
                    </Button>
                  )}

                  {alert.purchaseOrderId && onSelectPurchaseOrder && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectPurchaseOrder(alert.purchaseOrderId!)}
                      className="h-7 text-xs gap-1"
                    >
                      View Purchase Order
                    </Button>
                  )}

                  {alert.actionType === "inspect_cash_flow" && (
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1">
                      <Link to="/cash-flow">
                        <Waves className="h-3 w-3 text-primary" /> Inspect Cash Flow
                      </Link>
                    </Button>
                  )}

                  {alert.actionType === "simulate" && (
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1">
                      <Link
                        to="/simulator"
                        search={{
                          eventId: alert.productId ? `node_${alert.productId}` : `node_${alert.id}`,
                          eventName: alert.title,
                        }}
                      >
                        <FlaskConical className="h-3 w-3 text-primary" /> Simulate Impact
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
