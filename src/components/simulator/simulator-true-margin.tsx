import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatters";
import { TrendingDown, ShieldAlert, CheckCircle2, DollarSign, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrueMarginData } from "@/types";

interface SimulatorTrueMarginCardProps {
  margin: TrueMarginData;
}

export function SimulatorTrueMarginCard({ margin }: SimulatorTrueMarginCardProps) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const {
    revenuePaise,
    directCogsPaise,
    paperMarginPaise,
    paperMarginPercent,
    contagionDays,
    breakdown,
    totalContagionCostPaise,
    trueRippleMarginPaise,
    trueRippleMarginPercent,
  } = margin;

  const isSevere = trueRippleMarginPercent < 10;
  const isNegative = trueRippleMarginPaise < 0;

  return (
    <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-border/70 rounded-xl bg-card">
      <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Ripple-Adjusted True Margin</CardTitle>
              <CardDescription className="text-xs">
                Your actual profit after the costs caused by payment delays.
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              isNegative
                ? "bg-destructive/10 text-destructive border-destructive/20 font-semibold text-xs"
                : isSevere
                  ? "bg-warning/15 text-warning-foreground border-warning/30 font-semibold text-xs"
                  : "bg-success/10 text-success border-success/30 font-semibold text-xs"
            }
          >
            {isNegative
              ? "Negative Margin Risk"
              : isSevere
                ? "Contagion Compression"
                : "Healthy Margin"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Margin comparison header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 rounded-lg border border-border/60 bg-muted/15 divide-y sm:divide-y-0 sm:divide-x divide-border/50 overflow-hidden">
          <div className="p-3.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Paper Margin (Accounting)
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                {paperMarginPercent}%
              </span>
              <span className="text-xs text-muted-foreground tabular-nums font-mono">
                ({formatMoney(paperMarginPaise)})
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Revenue: {formatMoney(revenuePaise)} · COGS: {formatMoney(directCogsPaise)}
            </p>
          </div>

          <div className="p-3.5">
            <p className="text-[11px] font-semibold text-destructive uppercase tracking-wider">
              Ripple Contagion Drag
            </p>
            <div className="mt-1 flex items-baseline gap-1.5 text-destructive">
              <span className="text-xl font-bold font-mono tabular-nums">
                -{formatMoney(totalContagionCostPaise)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {contagionDays > 0 ? `${contagionDays} days compromised supply chain` : "Zero unmitigated delays"}
            </p>
          </div>

          <div className="p-3.5">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              True Ripple Margin
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-xl font-bold font-mono tabular-nums ${
                  isNegative ? "text-destructive" : isSevere ? "text-warning-foreground" : "text-primary"
                }`}
              >
                {trueRippleMarginPercent}%
              </span>
              <span className="text-xs text-muted-foreground tabular-nums font-mono">
                ({formatMoney(trueRippleMarginPaise)})
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Actual net economic value after cascading penalties
            </p>
          </div>
        </div>

        {/* Visual comparison bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Economic Realization</span>
            <span className="tabular-nums">
              {trueRippleMarginPercent}% realized / {paperMarginPercent}% nominal
            </span>
          </div>
          <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
            {/* Realized margin portion */}
            <div
              className={`h-full transition-all ${
                isNegative ? "bg-destructive" : isSevere ? "bg-warning" : "bg-primary"
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, (trueRippleMarginPaise / paperMarginPaise) * 100))}%`,
              }}
            />
            {/* Contagion lost portion */}
            <div
              className="h-full bg-destructive/60 transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, (totalContagionCostPaise / paperMarginPaise) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Expandable Itemized Contagion Cost Breakdown */}
        <div className="rounded-md border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setIsBreakdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-warning" />
              View calculation & cost breakdown
            </span>
            <span className="text-[11px] font-medium text-primary flex items-center gap-1">
              {isBreakdownOpen ? (
                <>
                  Hide details <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Show details <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </span>
          </button>

          <div className={cn("p-3 border-t bg-muted/10 space-y-2 transition-all", !isBreakdownOpen && "hidden")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center justify-between border-b pb-1">
                <span className="text-muted-foreground">Lost Supplier Early Discount</span>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {formatMoney(breakdown.lostDiscountPaise)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b pb-1">
                <span className="text-muted-foreground">Supplier Late Penalties / Halt Fees</span>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {formatMoney(breakdown.supplierHaltFeesPaise)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b pb-1 sm:border-b-0">
                <span className="text-muted-foreground">Secondary Customer SLA Penalties</span>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {formatMoney(breakdown.slaPenaltiesPaise)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Working-Capital Float Drag</span>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {formatMoney(breakdown.workingCapitalDragPaise)}
                </span>
              </div>

              {breakdown.floatFeePaise > 0 && (
                <div className="flex items-center justify-between col-span-full border-t pt-1">
                  <span className="text-muted-foreground">Tri-Party Split-Escrow Float Fee (2%)</span>
                  <span className="font-mono font-medium tabular-nums text-primary">
                    {formatMoney(breakdown.floatFeePaise)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
