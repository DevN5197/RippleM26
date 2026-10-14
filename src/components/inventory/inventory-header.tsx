import React from "react";
import {
  PackagePlus,
  ArrowLeftRight,
  ShoppingCart,
  Search,
  Filter,
  X,
  Building2,
} from "lucide-react";
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
import type { StockStatus } from "@/types";

interface InventoryHeaderProps {
  businessName: string;
  currency: string;
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: StockStatus | "all";
  onStatusChange: (value: StockStatus | "all") => void;
  categories: string[];
  onAddProduct: () => void;
  onRecordMovement: () => void;
  onCreatePurchaseOrder: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function InventoryHeader({
  businessName,
  currency,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  categories,
  onAddProduct,
  onRecordMovement,
  onCreatePurchaseOrder,
  onClearFilters,
  hasActiveFilters,
}: InventoryHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory</h1>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              <Building2 className="mr-1 h-3 w-3" />
              {businessName} · {currency}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect stock availability with procurement costs and customer commitments.
          </p>
        </div>

        {/* Primary and Secondary Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRecordMovement}
            className="gap-1.5 shadow-xs"
          >
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span>Record stock movement</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onCreatePurchaseOrder}
            className="gap-1.5 shadow-xs"
          >
            <ShoppingCart className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span>Create purchase order</span>
          </Button>

          <Button size="sm" onClick={onAddProduct} className="gap-1.5 shadow-xs">
            <PackagePlus className="h-4 w-4" aria-hidden />
            <span>Add product</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search by product name, SKU or category..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-card"
            aria-label="Search inventory"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-9 bg-card">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <Select
              value={status}
              onValueChange={(val) => onStatusChange(val as StockStatus | "all")}
            >
              <SelectTrigger className="h-9 bg-card">
                <SelectValue placeholder="Stock status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="low_stock">Low stock</SelectItem>
                <SelectItem value="stockout_risk">Stockout risk</SelectItem>
                <SelectItem value="incoming_stock">Incoming stock</SelectItem>
                <SelectItem value="out_of_stock">Out of stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
