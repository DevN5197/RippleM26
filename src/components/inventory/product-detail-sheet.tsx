import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import {
  Package,
  Boxes,
  ArrowLeftRight,
  ShoppingCart,
  Pencil,
  Network,
  FlaskConical,
  Truck,
  Users,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Info,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { formatMoney, formatDate, formatDateTime } from "@/lib/formatters";
import type { ProductDetailResponse } from "@/lib/api/inventoryApi";

interface ProductDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: ProductDetailResponse | null | undefined;
  isLoading: boolean;
  onRecordMovement: (productId: string) => void;
  onCreatePurchaseOrder: (productId: string) => void;
  onEditProduct: () => void;
  onViewPoDetails?: (poId: string) => void;
}

export function ProductDetailSheet({
  open,
  onOpenChange,
  data,
  isLoading,
  onRecordMovement,
  onCreatePurchaseOrder,
  onEditProduct,
  onViewPoDetails,
}: ProductDetailSheetProps) {
  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {isLoading || !data ? (
          <div className="p-6">
            <LoadingSkeleton count={6} />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Sheet Header */}
            <div className="p-6 pb-4 border-b bg-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground uppercase">
                      {data.product.sku}
                    </span>
                    <Badge variant="outline" className="text-[11px]">
                      {data.product.category || "General"}
                    </Badge>
                    <StatusBadge status={data.status} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mt-1.5">
                    {data.product.name}
                  </h2>
                  {data.product.description && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {data.product.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRecordMovement(data.product.id)}
                  className="h-8 text-xs gap-1.5"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Record movement
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCreatePurchaseOrder(data.product.id)}
                  className="h-8 text-xs gap-1.5"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Create PO
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEditProduct}
                  className="h-8 text-xs gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>

                <Button size="sm" variant="ghost" asChild className="h-8 text-xs gap-1.5 ml-auto">
                  <Link to="/relationships" search={{ selectedId: `node_stock_1` }}>
                    <Network className="h-3.5 w-3.5 text-primary" />
                    <span>View in Graph</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 p-6 pt-4">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-5 w-full h-9 mb-4">
                  <TabsTrigger value="overview" className="text-xs">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="movements" className="text-xs">
                    Movements ({data.movements.length})
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="text-xs">
                    POs ({data.purchaseOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="commitments" className="text-xs">
                    Sales ({data.customerOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="risk" className="text-xs">
                    Risk
                  </TabsTrigger>
                </TabsList>

                {/* 1. OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4">
                  {/* Stock Equation Explanatory Banner */}
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Info className="h-4 w-4 text-primary" />
                      Inventory Balance Formula
                    </div>
                    <div className="font-mono text-xs text-foreground bg-card p-2 rounded border">
                      Available Stock ({data.availableStock}) = Stock on Hand ({data.stockOnHand}) −
                      Reserved Stock ({data.reservedStock})
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      * Incoming stock ({data.incomingStock} units) is scheduled replenishment and is not yet available.
                    </p>
                  </div>

                  {/* 6 Metric Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border bg-card p-3 shadow-xs">
                      <span className="text-[11px] text-muted-foreground block">Stock on hand</span>
                      <span className="text-xl font-bold text-foreground">
                        {data.stockOnHand}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {data.product.unitOfMeasure || "units"}
                        </span>
                      </span>
                    </div>

                    <div className="rounded-lg border bg-card p-3 shadow-xs">
                      <span className="text-[11px] text-muted-foreground block">Reserved stock</span>
                      <span className="text-xl font-bold text-warning-foreground">
                        {data.reservedStock}
                      </span>
                    </div>

                    <div className="rounded-lg border bg-card p-3 shadow-xs">
                      <span className="text-[11px] text-muted-foreground block">Available stock</span>
                      <span
                        className={`text-xl font-bold ${
                          data.availableStock <= 0
                            ? "text-destructive"
                            : data.availableStock < data.reorderThreshold
                              ? "text-warning-foreground"
                              : "text-foreground"
                        }`}
                      >
                        {data.availableStock}
                      </span>
                    </div>

                    <div className="rounded-lg border bg-card p-3 shadow-xs">
                      <span className="text-[11px] text-muted-foreground block">Incoming on order</span>
                      <span className="text-xl font-bold text-primary">
                        {data.incomingStock > 0 ? `+${data.incomingStock}` : "0"}
                      </span>
                    </div>

                    <div className="rounded-lg border bg-card p-3 shadow-xs">
                      <span className="text-[11px] text-muted-foreground block">Reorder threshold</span>
                      <span className="text-xl font-bold text-foreground">
                        {data.reorderThreshold}
                      </span>
                    </div>

                    <div className="rounded-lg border bg-card p-3 shadow-xs">
                      <span className="text-[11px] text-muted-foreground block">Unit purchase cost</span>
                      <span className="text-xl font-bold text-foreground font-mono">
                        {data.unitCostPaise > 0 ? formatMoney(data.unitCostPaise) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Valuation Breakdown Card */}
                  {data.inventoryValuationPaise !== undefined && (
                    <div className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Total On-Hand Valuation:</span>
                        <span className="font-bold text-base text-foreground font-mono">
                          {formatMoney(data.inventoryValuationPaise)}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">
                        Calculated as {data.stockOnHand} on-hand units × {formatMoney(data.unitCostPaise)} unit cost.
                      </div>
                    </div>
                  )}

                  {/* Preferred Supplier & Delivery Details */}
                  <div className="rounded-lg border bg-card p-4 space-y-2 text-xs">
                    <span className="font-semibold text-foreground block">Procurement Profile</span>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Preferred Supplier:</span>
                      <span className="font-medium text-foreground">
                        {data.preferredSupplier ? (
                          <Link to="/suppliers" className="text-primary hover:underline">
                            {data.preferredSupplier.name} ({data.preferredSupplier.paymentTermsDays}d terms)
                          </Link>
                        ) : (
                          "None assigned"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Next Scheduled Replenishment:</span>
                      <span className="font-medium text-foreground">
                        {data.inventory.expectedRestockDate
                          ? formatDate(data.inventory.expectedRestockDate, "d MMM yyyy")
                          : "No active PO scheduled"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Estimated Run-Out / Stockout:</span>
                      <span className="font-medium text-foreground">
                        {data.projectedStockoutDate
                          ? formatDate(data.projectedStockoutDate, "d MMM yyyy")
                          : "Stable (no near-term stockout)"}
                      </span>
                    </div>
                  </div>

                  {/* Simulation Card */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Test Delivery Delays in Simulator
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        See how delayed replenishment cascades to customer orders and cash balance.
                      </span>
                    </div>
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1">
                      <Link
                        to="/simulator"
                        search={{
                          eventId: `node_stock_1`,
                          eventName: `${data.product.name} Restock`,
                        }}
                      >
                        <FlaskConical className="h-3 w-3" /> Simulate
                      </Link>
                    </Button>
                  </div>
                </TabsContent>

                {/* 2. STOCK MOVEMENTS TAB */}
                <TabsContent value="movements" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Movement Audit Log
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRecordMovement(data.product.id)}
                      className="h-7 text-xs"
                    >
                      Record Movement
                    </Button>
                  </div>

                  {data.movements.length === 0 ? (
                    <div className="rounded-lg border p-6 text-center text-xs text-muted-foreground">
                      No stock movements recorded yet for this product.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {data.movements.map((mov) => {
                        const isPositive =
                          mov.type === "receipt" || mov.type === "return";
                        return (
                          <div
                            key={mov.id}
                            className="flex items-start justify-between p-3 rounded-lg border bg-card text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] capitalize ${
                                    isPositive
                                      ? "border-success/30 text-success bg-success/5"
                                      : "border-warning/30 text-warning-foreground bg-warning/5"
                                  }`}
                                >
                                  {mov.type.replace(/_/g, " ")}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {formatDate(mov.date, "d MMM yyyy")}
                                </span>
                              </div>
                              {mov.note && (
                                <p className="text-[11px] text-foreground mt-1">{mov.note}</p>
                              )}
                              {mov.referenceId && (
                                <span className="text-[10px] text-muted-foreground block font-mono">
                                  Ref: {mov.referenceId}
                                </span>
                              )}
                            </div>

                            <div className="text-right">
                              <span
                                className={`font-bold text-sm ${
                                  isPositive ? "text-success" : "text-destructive"
                                }`}
                              >
                                {isPositive ? `+${mov.quantity}` : `-${mov.quantity}`}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                Balance: {mov.resultingBalance}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* 3. PURCHASE ORDERS TAB */}
                <TabsContent value="orders" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Related Purchase Orders
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCreatePurchaseOrder(data.product.id)}
                      className="h-7 text-xs"
                    >
                      New Purchase Order
                    </Button>
                  </div>

                  {data.purchaseOrders.length === 0 ? (
                    <div className="rounded-lg border p-6 text-center text-xs text-muted-foreground">
                      No purchase orders recorded for this product.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.purchaseOrders.map((po) => {
                        const supplier = data.preferredSupplier;
                        return (
                          <div
                            key={po.id}
                            className="p-3 rounded-lg border bg-card text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">
                                  {po.poNumber || po.id}
                                </span>
                                <StatusBadge status={po.status} />
                              </div>
                              <span className="font-bold text-sm text-foreground font-mono">
                                {formatMoney(po.totalPaise)}
                              </span>
                            </div>

                            <div className="flex justify-between text-muted-foreground text-[11px]">
                              <span>Ordered: {formatDate(po.orderDate, "d MMM yyyy")}</span>
                              <span>
                                Expected: {formatDate(po.expectedDeliveryDate, "d MMM yyyy")}
                              </span>
                              <span>Units: {po.quantity || 0}</span>
                            </div>

                            {onViewPoDetails && (
                              <div className="pt-1 flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewPoDetails(po.id)}
                                  className="h-6 text-[11px] p-0 text-primary hover:underline"
                                >
                                  View PO Details →
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* 4. CUSTOMER COMMITMENTS TAB */}
                <TabsContent value="commitments" className="space-y-3">
                  <span className="text-xs font-semibold text-foreground block">
                    Committed Customer Orders
                  </span>

                  {data.customerOrders.length === 0 ? (
                    <div className="rounded-lg border p-6 text-center text-xs text-muted-foreground">
                      No customer orders currently reserving this product.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.customerOrders.map((co) => (
                        <div
                          key={co.id}
                          className="p-3 rounded-lg border bg-card text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {co.customerName}
                            </span>
                            <StatusBadge status={co.status} />
                          </div>
                          <div className="flex justify-between text-muted-foreground text-[11px]">
                            <span>Quantity: {co.quantity} units</span>
                            <span>Order Total: {formatMoney(co.totalPaise)}</span>
                            <span>
                              Delivery:{" "}
                              {co.deliveryDate
                                ? formatDate(co.deliveryDate, "d MMM yyyy")
                                : "Scheduled"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* 5. RISK ANALYSIS TAB */}
                <TabsContent value="risk" className="space-y-3">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          data.status === "stockout_risk" || data.status === "out_of_stock"
                            ? "text-destructive"
                            : data.status === "low_stock"
                              ? "text-warning-foreground"
                              : "text-success"
                        }`}
                      />
                      <span className="font-semibold text-sm text-foreground">
                        Operational Risk Assessment
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                      {data.status === "stockout_risk" ? (
                        <p className="text-destructive font-medium">
                          Critical Alert: Open customer order commitments exceed available warehouse stock.
                          Immediate procurement action required to avoid delivery delay penalties.
                        </p>
                      ) : data.status === "low_stock" ? (
                        <p className="text-warning-foreground font-medium">
                          Warning: Available stock ({data.availableStock}) is below reorder threshold (
                          {data.reorderThreshold}). Place a purchase order before supplier lead time window closes.
                        </p>
                      ) : data.status === "out_of_stock" ? (
                        <p className="text-destructive font-medium">
                          Critical Alert: Zero units available on hand. Product cannot fulfill new customer orders.
                        </p>
                      ) : (
                        <p className="text-success font-medium">
                          Healthy: Available stock buffer adequately covers projected demand and current order commitments.
                        </p>
                      )}
                    </div>

                    <div className="border-t pt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Forecast Demand</span>
                        <span className="font-semibold text-foreground">
                          ~{data.forecastDemand} units / week
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Lead Time Buffer</span>
                        <span className="font-semibold text-foreground">
                          {data.preferredSupplier
                            ? `${data.preferredSupplier.paymentTermsDays} days supplier lead time`
                            : "Standard 15 days"}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
