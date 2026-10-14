import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Truck,
  Calendar,
  Building2,
  Boxes,
  ArrowLeftRight,
  Network,
  FlaskConical,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatMoney, formatDate } from "@/lib/formatters";
import type { EnrichedPurchaseOrder } from "@/lib/api/purchaseOrderApi";

interface PurchaseOrderDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: EnrichedPurchaseOrder | null | undefined;
  onReceiveStock: (poId: string) => void;
}

export function PurchaseOrderDetailSheet({
  open,
  onOpenChange,
  order,
  onReceiveStock,
}: PurchaseOrderDetailSheetProps) {
  if (!open || !order) return null;

  const isFullyReceived = order.status === "received";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pb-4 border-b bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">
                  {order.poNumber || order.id}
                </span>
                <StatusBadge status={order.status} />
              </div>

              <div className="flex items-center gap-1.5">
                {!isFullyReceived && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReceiveStock(order.id)}
                    className="h-8 text-xs gap-1.5 text-primary"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    Receive Items
                  </Button>
                )}

                <Button size="sm" variant="ghost" asChild className="h-8 text-xs gap-1.5">
                  <Link to="/relationships" search={{ selectedId: `node_${order.id}` }}>
                    <Network className="h-3.5 w-3.5 text-primary" />
                    <span>Graph</span>
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-foreground font-medium">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {order.supplier?.name || "Supplier"}
              </span>
              <span>Ordered: {formatDate(order.orderDate, "d MMM yyyy")}</span>
            </div>
          </div>

          <div className="p-6 space-y-5 flex-1">
            {/* Delivery Milestones */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" />
                Delivery Timeline & Status
              </span>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded bg-muted/30 p-2 border">
                  <span className="text-[10px] text-muted-foreground block">Order Date</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(order.orderDate, "d MMM")}
                  </span>
                </div>
                <div className="rounded bg-primary/5 p-2 border border-primary/20">
                  <span className="text-[10px] text-primary block">Expected Delivery</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(order.expectedDeliveryDate, "d MMM yyyy")}
                  </span>
                </div>
                <div className="rounded bg-muted/30 p-2 border">
                  <span className="text-[10px] text-muted-foreground block">Receipt Status</span>
                  <span className="font-semibold text-foreground">
                    {order.receivedUnits} / {order.orderedUnits} units
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground block">Line Items</span>
              <div className="rounded-lg border bg-card overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b">
                    <tr>
                      <th className="text-left p-2.5">Item</th>
                      <th className="text-right p-2.5">Qty</th>
                      <th className="text-right p-2.5">Received</th>
                      <th className="text-right p-2.5">Unit Price</th>
                      <th className="text-right p-2.5 pr-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {order.lineItemsDetails?.map((li) => (
                      <tr key={li.id}>
                        <td className="p-2.5">
                          <span className="font-medium text-foreground block">
                            {li.product?.name || "Product"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {li.product?.sku}
                          </span>
                        </td>
                        <td className="text-right p-2.5 text-foreground">{li.quantity}</td>
                        <td className="text-right p-2.5">
                          <span
                            className={
                              (li.receivedQuantity ?? 0) >= li.quantity
                                ? "text-success font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {li.receivedQuantity ?? 0}
                          </span>
                        </td>
                        <td className="text-right p-2.5 font-mono text-muted-foreground">
                          {formatMoney(li.unitPricePaise)}
                        </td>
                        <td className="text-right p-2.5 pr-3 font-semibold text-foreground font-mono">
                          {formatMoney(li.totalPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Commitments Breakdown */}
            <div className="rounded-lg border bg-card p-4 space-y-2.5 text-xs">
              <span className="font-semibold text-foreground block">Financial Commitments</span>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Order Total:</span>
                <span className="font-bold text-sm text-foreground font-mono">
                  {formatMoney(order.totalPaise)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Advance Paid / Scheduled:</span>
                <span className="font-semibold text-foreground font-mono">
                  {order.advancePaidPaise > 0 ? formatMoney(order.advancePaidPaise) : "₹0"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Balance Outstanding:</span>
                <span className="font-bold text-foreground font-mono">
                  {formatMoney(order.outstandingPaise)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Payment Due Date:</span>
                <span className="font-medium text-foreground">
                  {order.paymentDueDate
                    ? formatDate(order.paymentDueDate, "d MMM yyyy")
                    : "Net payment terms"}
                </span>
              </div>
            </div>

            {/* Simulation Link */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-foreground block">
                  Ripple What-If Simulation
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Simulate supplier delivery delay on this purchase order.
                </span>
              </div>
              <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1">
                <Link
                  to="/simulator"
                  search={{
                    eventId: `node_${order.id}`,
                    eventName: `${order.poNumber || order.id} Delivery`,
                  }}
                >
                  <FlaskConical className="h-3 w-3" /> Test Delay
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
