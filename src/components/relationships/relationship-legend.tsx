import React, { useState } from "react";
import {
  Truck,
  CreditCard,
  Package,
  Boxes,
  Layers,
  Users,
  ShoppingCart,
  FileText,
  ArrowDownToLine,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function RelationshipLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-white/20 bg-[#121216]/95 p-3 text-xs shadow-lg backdrop-blur-md transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <Info className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          <span>Graph Legend</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              Hide <ChevronUp className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              Explore types <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3 pt-2 border-t border-white/15 animate-in fade-in-50 duration-150">
          {/* Node Types Grid */}
          <div>
            <p className="font-semibold text-white/70 text-[11px] mb-2 uppercase tracking-wide">
              Entity & Event Nodes
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-indigo-500/20 text-indigo-300">
                  <Truck className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Supplier</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-sky-500/20 text-sky-300">
                  <CreditCard className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Supplier Payment</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-indigo-500/20 text-indigo-300">
                  <Package className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Purchase Order</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-teal-500/20 text-teal-300">
                  <Boxes className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Inventory Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-teal-500/20 text-teal-300">
                  <Layers className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Inventory Stock</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-emerald-500/20 text-emerald-300">
                  <Users className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Customer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-emerald-500/20 text-emerald-300">
                  <ShoppingCart className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Customer Sale</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-emerald-500/20 text-emerald-300">
                  <FileText className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Customer Invoice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-emerald-500/25 text-emerald-300">
                  <ArrowDownToLine className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Expected Receipt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-rose-500/25 text-rose-300">
                  <AlertTriangle className="h-3 w-3" />
                </span>
                <span className="text-white/85 text-[11px]">Cash-flow Risk</span>
              </div>
            </div>
          </div>

          {/* Status & Connection indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/15">
            <div>
              <p className="font-semibold text-white/70 text-[11px] mb-1.5 uppercase tracking-wide">
                Statuses
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  ● Completed
                </span>
                <span className="rounded bg-sky-950/80 border border-sky-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                  ● Upcoming
                </span>
                <span className="rounded bg-rose-950/80 border border-rose-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                  ● Delayed
                </span>
                <span className="rounded bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  ▲ At Risk
                </span>
              </div>
            </div>

            <div>
              <p className="font-semibold text-white/70 text-[11px] mb-1.5 uppercase tracking-wide">
                Dependency Edges
              </p>
              <div className="space-y-1 text-[11px] text-white/80">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 bg-white/70" />
                  <span>Directional dependency & milestone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 bg-amber-400 border-dashed" />
                  <span>Potential risk cascade / shortfall</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
