import React, { useState } from "react";
import {
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  ArrowLeftRight,
  ShoppingCart,
  Pencil,
  Network,
  FlaskConical,
  PackageX,
  PackagePlus,
  Truck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { formatMoney, formatDate } from "@/lib/formatters";
import type { InventoryItemWithDetails, StockStatus } from "@/types";

interface InventoryTableProps {
  items: InventoryItemWithDetails[];
  isLoading: boolean;
  error?: Error | null | undefined;
  onRetry?: () => void;
  onSelectProduct: (productId: string) => void;
  onRecordMovement: (productId: string) => void;
  onCreatePurchaseOrder: (productId: string) => void;
  onEditProduct: (product: InventoryItemWithDetails["product"]) => void;
  onViewInGraph: (productId: string) => void;
  onSimulate: (productId: string, productName: string) => void;
  onAddProduct: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

type SortField = "name" | "available" | "onHand" | "cost" | "risk";
type SortDirection = "asc" | "desc";

export function InventoryTable({
  items,
  isLoading,
  error,
  onRetry,
  onSelectProduct,
  onRecordMovement,
  onCreatePurchaseOrder,
  onEditProduct,
  onViewInGraph,
  onSimulate,
  onAddProduct,
  onClearFilters,
  hasActiveFilters,
}: InventoryTableProps) {
  const [sortField, setSortField] = useState<SortField>("risk");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field)
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-foreground" />
    );
  };

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
        <ErrorState message="Could not load inventory catalog." retry={onRetry} />
      </div>
    );
  }

  if (items.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-lg border bg-card p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <PackageX className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No matching inventory</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No products match your current search and filter criteria.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear all filters
            </Button>
            <Button size="sm" onClick={onAddProduct}>
              <PackagePlus className="mr-1.5 h-4 w-4" /> Add product
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-card p-8 shadow-xs">
        <EmptyState
          title="No products in catalog"
          description="Track stock availability, procurement costs, reorder thresholds, and customer commitments."
          action={{
            label: "Add product",
            onClick: onAddProduct,
          }}
        />
      </div>
    );
  }

  // Client-side sort
  const sortedItems = [...items].sort((a, b) => {
    let comparison = 0;
    if (sortField === "name") {
      comparison = a.product.name.localeCompare(b.product.name);
    } else if (sortField === "available") {
      comparison = a.availableStock - b.availableStock;
    } else if (sortField === "onHand") {
      comparison = a.stockOnHand - b.stockOnHand;
    } else if (sortField === "cost") {
      comparison = a.unitCostPaise - b.unitCostPaise;
    } else if (sortField === "risk") {
      // Prioritize stockout_risk > out_of_stock > low_stock > incoming_stock > healthy
      const riskRank: Record<StockStatus, number> = {
        stockout_risk: 0,
        out_of_stock: 1,
        low_stock: 2,
        incoming_stock: 3,
        healthy: 4,
      };
      comparison = riskRank[a.status] - riskRank[b.status];
      if (comparison === 0) {
        comparison = a.availableStock - b.availableStock;
      }
    }
    return sortDirection === "desc" ? -comparison : comparison;
  });

  const totalPages = Math.ceil(sortedItems.length / pageSize);
  const paginatedItems = sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="min-w-[200px]">
                <button
                  className="flex items-center text-xs font-semibold text-foreground hover:text-primary"
                  onClick={() => handleSort("name")}
                >
                  Product & SKU {getSortIcon("name")}
                </button>
              </TableHead>
              <TableHead className="min-w-[120px]">Category</TableHead>
              <TableHead className="text-right min-w-[100px]">
                <button
                  className="inline-flex items-center text-xs font-semibold text-foreground hover:text-primary ml-auto"
                  onClick={() => handleSort("onHand")}
                >
                  On hand {getSortIcon("onHand")}
                </button>
              </TableHead>
              <TableHead className="text-right min-w-[90px]">Reserved</TableHead>
              <TableHead className="text-right min-w-[100px]">
                <button
                  className="inline-flex items-center text-xs font-semibold text-foreground hover:text-primary ml-auto"
                  onClick={() => handleSort("available")}
                >
                  Available {getSortIcon("available")}
                </button>
              </TableHead>
              <TableHead className="text-right min-w-[95px]">Incoming</TableHead>
              <TableHead className="text-right min-w-[95px]">Threshold</TableHead>
              <TableHead className="min-w-[130px]">Next delivery</TableHead>
              <TableHead className="text-right min-w-[100px]">
                <button
                  className="inline-flex items-center text-xs font-semibold text-foreground hover:text-primary ml-auto"
                  onClick={() => handleSort("cost")}
                >
                  Unit cost {getSortIcon("cost")}
                </button>
              </TableHead>
              <TableHead className="min-w-[130px]">
                <button
                  className="flex items-center text-xs font-semibold text-foreground hover:text-primary"
                  onClick={() => handleSort("risk")}
                >
                  Status {getSortIcon("risk")}
                </button>
              </TableHead>
              <TableHead className="text-right min-w-[60px] pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((row) => {
              const {
                product,
                availableStock,
                stockOnHand,
                reservedStock,
                incomingStock,
                reorderThreshold,
              } = row;
              const hasIncoming = incomingStock > 0;
              const isLow = availableStock < reorderThreshold;

              return (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onSelectProduct(product.id)}
                >
                  {/* Product Name and SKU */}
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground hover:text-primary">
                        {product.name}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {product.sku}
                      </span>
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {product.category || "General"}
                    </span>
                  </TableCell>

                  {/* Stock on Hand */}
                  <TableCell className="text-right font-medium text-foreground text-sm">
                    {stockOnHand}
                  </TableCell>

                  {/* Reserved Quantity */}
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {reservedStock > 0 ? (
                      <span className="text-warning-foreground font-medium">{reservedStock}</span>
                    ) : (
                      "0"
                    )}
                  </TableCell>

                  {/* Available Quantity */}
                  <TableCell className="text-right font-semibold text-sm">
                    <span
                      className={
                        availableStock <= 0
                          ? "text-destructive"
                          : isLow
                            ? "text-warning-foreground"
                            : "text-foreground"
                      }
                    >
                      {availableStock}
                    </span>
                  </TableCell>

                  {/* Incoming Quantity */}
                  <TableCell className="text-right text-xs">
                    {hasIncoming ? (
                      <span className="inline-flex items-center gap-1 font-medium text-primary">
                        <Truck className="h-3 w-3" />+{incomingStock}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Reorder Threshold */}
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {reorderThreshold}
                  </TableCell>

                  {/* Next Expected Delivery */}
                  <TableCell className="text-xs">
                    {row.nextExpectedDelivery ? (
                      <span className="text-foreground font-medium">
                        {formatDate(row.nextExpectedDelivery, "d MMM yyyy")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Unit Cost */}
                  <TableCell className="text-right text-xs font-mono text-muted-foreground">
                    {row.unitCostPaise > 0 ? formatMoney(row.unitCostPaise) : "—"}
                  </TableCell>

                  {/* Stock Status Badge */}
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>

                  {/* Actions Dropdown */}
                  <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={`Actions for ${product.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="text-xs">{product.name}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSelectProduct(product.id)}>
                          <Eye className="mr-2 h-4 w-4" /> View product details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRecordMovement(product.id)}>
                          <ArrowLeftRight className="mr-2 h-4 w-4" /> Record stock movement
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreatePurchaseOrder(product.id)}>
                          <ShoppingCart className="mr-2 h-4 w-4" /> Create purchase order
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditProduct(product)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit product
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewInGraph(product.id)}>
                          <Network className="mr-2 h-4 w-4" /> View in relationship graph
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSimulate(product.id, product.name)}>
                          <FlaskConical className="mr-2 h-4 w-4" /> Simulate in Ripple
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination & Status Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground gap-2">
        <div>
          Showing{" "}
          <span className="font-medium text-foreground">
            {Math.min(items.length, (currentPage - 1) * pageSize + 1)}
          </span>{" "}
          to{" "}
          <span className="font-medium text-foreground">
            {Math.min(items.length, currentPage * pageSize)}
          </span>{" "}
          of <span className="font-medium text-foreground">{items.length}</span> products
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs px-2.5"
            >
              Previous
            </Button>
            <span className="px-2 text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 text-xs px-2.5"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
