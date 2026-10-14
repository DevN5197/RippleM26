import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Search, ShoppingCart, Eye, ArrowLeftRight, Truck, Plus, ExternalLink } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/formatters";
import type { EnrichedPurchaseOrder, Supplier, PurchaseOrderStatus } from "@/types";

interface PurchaseOrderListProps {
  orders: EnrichedPurchaseOrder[];
  suppliers: Supplier[];
  isLoading: boolean;
  error?: Error | null | undefined;
  onRetry?: () => void;
  onSelectPo: (poId: string) => void;
  onCreatePo: () => void;
  onReceiveItems: (poId: string) => void;
}

export function PurchaseOrderList({
  orders,
  suppliers,
  isLoading,
  error,
  onRetry,
  onSelectPo,
  onCreatePo,
  onReceiveItems,
}: PurchaseOrderListProps) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "all">("all");

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-xs">
        <LoadingSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-xs">
        <ErrorState message="Could not load purchase orders." retry={onRetry} />
      </div>
    );
  }

  // Filter
  const filteredOrders = orders.filter((po) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesNum = po.poNumber?.toLowerCase().includes(q) || po.id.toLowerCase().includes(q);
      const matchesSup = po.supplier?.name.toLowerCase().includes(q);
      const matchesItem = po.lineItemsDetails?.some((li) =>
        li.product?.name.toLowerCase().includes(q),
      );
      if (!matchesNum && !matchesSup && !matchesItem) return false;
    }

    if (supplierFilter !== "all" && po.supplierId !== supplierFilter) {
      return false;
    }

    if (statusFilter !== "all" && po.status !== statusFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by PO number, supplier, or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-card"
            />
          </div>

          <div className="w-44">
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-9 bg-card text-xs">
                <SelectValue placeholder="All suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as PurchaseOrderStatus | "all")}
            >
              <SelectTrigger className="h-9 bg-card text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="partially_received">Partially received</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button size="sm" onClick={onCreatePo} className="gap-1.5 shadow-xs whitespace-nowrap">
          <Plus className="h-4 w-4" /> Create Purchase Order
        </Button>
      </div>

      {/* PO Table */}
      <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="min-w-[130px]">PO Number</TableHead>
                <TableHead className="min-w-[150px]">Supplier</TableHead>
                <TableHead className="min-w-[110px]">Order Date</TableHead>
                <TableHead className="min-w-[120px]">Expected Delivery</TableHead>
                <TableHead className="text-right min-w-[90px]">Ordered</TableHead>
                <TableHead className="text-right min-w-[90px]">Received</TableHead>
                <TableHead className="text-right min-w-[110px]">Order Total</TableHead>
                <TableHead className="text-right min-w-[100px]">Paid</TableHead>
                <TableHead className="text-right min-w-[100px]">Outstanding</TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
                <TableHead className="text-right min-w-[100px] pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-8 text-center text-xs text-muted-foreground"
                  >
                    No purchase orders found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((po) => (
                  <TableRow
                    key={po.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => onSelectPo(po.id)}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {po.poNumber || po.id}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-foreground">
                      {po.supplier?.name || "Supplier"}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(po.orderDate, "d MMM yyyy")}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-foreground">
                      {formatDate(po.expectedDeliveryDate, "d MMM yyyy")}
                    </TableCell>

                    <TableCell className="text-right text-xs text-foreground font-medium">
                      {po.orderedUnits}
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <span
                        className={
                          po.receivedUnits >= po.orderedUnits
                            ? "text-success font-semibold"
                            : po.receivedUnits > 0
                              ? "text-warning-foreground font-semibold"
                              : "text-muted-foreground"
                        }
                      >
                        {po.receivedUnits} / {po.orderedUnits}
                      </span>
                    </TableCell>

                    <TableCell className="text-right text-xs font-bold text-foreground font-mono">
                      {formatMoney(po.totalPaise)}
                    </TableCell>

                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {po.advancePaidPaise > 0 ? formatMoney(po.advancePaidPaise) : "₹0"}
                    </TableCell>

                    <TableCell className="text-right text-xs font-medium text-foreground font-mono">
                      {formatMoney(po.outstandingPaise)}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={po.status} />
                    </TableCell>

                    <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {po.status !== "received" && po.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReceiveItems(po.id)}
                            className="h-7 text-xs text-primary hover:text-primary"
                          >
                            Receive
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onSelectPo(po.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
