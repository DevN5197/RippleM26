import React from "react";
import { Link } from "@tanstack/react-router";
import { Search, Filter, RotateCcw, Maximize2, FlaskConical, X, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { RelationshipNodeType, RelationshipNodeStatus } from "@/types";

export interface FilterState {
  search: string;
  type: string;
  status: string;
  partner: string;
  riskOnly: boolean;
}

interface RelationshipToolbarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetView: () => void;
  onResetFilters: () => void;
  matchCount: number;
  totalCount: number;
  partnerOptions?: string[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function RelationshipToolbar({
  filters,
  onFilterChange,
  onResetView,
  onResetFilters,
  matchCount,
  totalCount,
  partnerOptions = [],
  isFullscreen,
  onToggleFullscreen,
}: RelationshipToolbarProps) {
  const isFiltered =
    Boolean(filters.search) ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.partner !== "all" ||
    filters.riskOnly;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/15 bg-[#111115] p-3 sm:p-4 shadow-sm text-white">
      {/* Top Row: Search + Primary Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
          <Input
            placeholder="Search suppliers, orders, invoices (INV-2001, PO-1)..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9 pr-8 h-9 text-xs bg-black/60 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ ...filters, search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View Controls & Simulator CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFullscreen}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-white/20 bg-white/5 text-white hover:bg-white/15"
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand Graph to Fullscreen"}
            >
              <Maximize2 className="h-3.5 w-3.5 text-white/70" />
              <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onResetView}
            className="h-9 gap-1.5 text-xs font-semibold border-white/20 bg-white/5 text-white hover:bg-white/15"
            title="Fit entire graph in viewport"
          >
            <RotateCcw className="h-3.5 w-3.5 text-white/70" />
            <span className="hidden md:inline">Fit view</span>
          </Button>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-9 gap-1 text-xs text-white/80 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset filters
            </Button>
          )}

          <Button size="sm" asChild className="h-9 gap-1.5 shadow-xs bg-white text-black font-semibold hover:bg-white/90">
            <Link to="/simulator">
              <FlaskConical className="h-4 w-4 text-black" />
              <span>Ripple Simulator</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Bottom Filter Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1.5 text-white/80 mr-1">
          <Filter className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-semibold hidden sm:inline">Filters:</span>
        </div>

        {/* Node Type Selector */}
        <Select
          value={filters.type}
          onValueChange={(val) => onFilterChange({ ...filters, type: val })}
        >
          <SelectTrigger className="h-8 text-xs w-[140px] bg-black/60 border-white/20 text-white">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181b] border-white/20 text-white">
            <SelectItem value="all">All event types</SelectItem>
            <SelectItem value="supplier">Suppliers</SelectItem>
            <SelectItem value="purchase_order">Purchase orders</SelectItem>
            <SelectItem value="supplier_payment">Supplier payments</SelectItem>
            <SelectItem value="inventory_delivery">Deliveries</SelectItem>
            <SelectItem value="inventory_stock">Stock</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="sale">Customer sales</SelectItem>
            <SelectItem value="customer_invoice">Invoices</SelectItem>
            <SelectItem value="expected_receipt">Expected receipts</SelectItem>
            <SelectItem value="cash_flow_risk">Cash-flow risks</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Selector */}
        <Select
          value={filters.status}
          onValueChange={(val) => onFilterChange({ ...filters, status: val })}
        >
          <SelectTrigger className="h-8 text-xs w-[130px] bg-black/60 border-white/20 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181b] border-white/20 text-white">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="at_risk">At risk</SelectItem>
          </SelectContent>
        </Select>

        {/* Partner Selector */}
        <Select
          value={filters.partner}
          onValueChange={(val) => onFilterChange({ ...filters, partner: val })}
        >
          <SelectTrigger className="h-8 text-xs w-[140px] bg-black/60 border-white/20 text-white">
            <SelectValue placeholder="Partner" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181b] border-white/20 text-white">
            <SelectItem value="all">All partners</SelectItem>
            {partnerOptions && partnerOptions.length > 0
              ? partnerOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))
              : null}
          </SelectContent>
        </Select>

        {/* Risk Only Toggle */}
        <div className="flex items-center gap-2 rounded-md border border-white/20 bg-black/60 px-2.5 py-1 text-xs ml-auto">
          <Switch
            id="risk-toggle"
            checked={filters.riskOnly}
            onCheckedChange={(checked) => onFilterChange({ ...filters, riskOnly: checked })}
            className="scale-75"
          />
          <Label
            htmlFor="risk-toggle"
            className="flex items-center gap-1 cursor-pointer font-medium text-xs text-white"
          >
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
            <span>Risk only</span>
          </Label>
        </div>

        {/* Results Counter Badge */}
        <Badge variant="outline" className="text-[11px] font-mono tabular-nums ml-1 border-white/25 bg-white/10 text-white">
          {matchCount} of {totalCount} events
        </Badge>
      </div>
    </div>
  );
}
