import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatters";
import {
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Percent,
  SlidersHorizontal,
  Calculator,
  Microscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrueMarginData } from "@/types";

interface SimulatorTrueMarginCardProps {
  margin: TrueMarginData;
}

export function SimulatorTrueMarginCard({ margin }: SimulatorTrueMarginCardProps) {
  const [detailedMode, setDetailedMode] = useState(false);

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
    <Card className="shadow-xs border-border/70 rounded-xl bg-card overflow-hidden">
      <CardHeader className="pb-2.5 pt-3.5 px-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Profit Reality Check
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Your actual profit after the costs caused by payment delays.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={detailedMode ? "default" : "outline"}
              size="sm"
              onClick={() => setDetailedMode((v) => !v)}
              className="h-7 px-2.5 text-xs font-semibold gap-1.5 shadow-xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Detailed Analysis Mode: {detailedMode ? "ON" : "OFF"}</span>
            </Button>
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
                  ? "Profit Eaten by Delays"
                  : "Healthy Margin"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3.5 px-4 sm:px-5 pb-4">
        {/* Side-by-side comparison bar: Expected Profit on Paper - Money Lost From Delays = Actual Profit After Delays */}
        <div className="grid grid-cols-1 sm:grid-cols-3 rounded-lg border border-border/60 bg-muted/15 divide-y sm:divide-y-0 sm:divide-x divide-border/50 overflow-hidden">
          {/* 1. Expected Profit on Paper */}
          <div className="p-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Expected Profit on Paper
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
                {paperMarginPercent}%
              </span>
              <span className="text-xs text-muted-foreground tabular-nums font-mono font-medium">
                ({formatMoney(paperMarginPaise)})
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Revenue: {formatMoney(revenuePaise)} · COGS: {formatMoney(directCogsPaise)}
            </p>
          </div>

          {/* 2. Money Lost From Delays */}
          <div className="p-3">
            <p className="text-[11px] font-semibold text-destructive uppercase tracking-wider">
              Money Lost From Delays (Late Fees & Halts)
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5 text-destructive">
              <span className="text-lg sm:text-xl font-bold font-mono tabular-nums">
                -{formatMoney(totalContagionCostPaise)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {contagionDays > 0
                ? `${contagionDays} days compromised supply chain`
                : "Zero unmitigated delays"}
            </p>
          </div>

          {/* 3. Actual Profit After Delays */}
          <div className="p-3">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              Actual Profit After Delays
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-lg sm:text-xl font-bold font-mono tabular-nums",
                  isNegative
                    ? "text-destructive"
                    : isSevere
                      ? "text-warning-foreground"
                      : "text-primary",
                )}
              >
                {trueRippleMarginPercent}%
              </span>
              <span className="text-xs text-muted-foreground tabular-nums font-mono font-medium">
                ({formatMoney(trueRippleMarginPaise)})
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Actual net economic value after cascading penalties
            </p>
          </div>
        </div>

        {/* Visual Realization Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground text-[11px]">Profit Protection Gauge</span>
            <span className="tabular-nums text-[11px] font-mono">
              {trueRippleMarginPercent}% realized of {paperMarginPercent}% expected
            </span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden flex">
            {/* Realized margin portion */}
            <div
              className={cn(
                "h-full transition-all duration-500",
                isNegative ? "bg-destructive" : isSevere ? "bg-warning" : "bg-emerald-500",
              )}
              style={{
                width: `${Math.max(0, Math.min(100, (trueRippleMarginPaise / paperMarginPaise) * 100))}%`,
              }}
            />
            {/* Contagion lost portion */}
            <div
              className="h-full bg-destructive/70 transition-all duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, (totalContagionCostPaise / paperMarginPaise) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* 4-Item Itemized Cost Breakdown Visible Right Inside Card */}
        <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-warning" />
              Where Did the Profit Go? (4 Breakdown Items)
            </span>
            <span className="font-mono font-semibold text-destructive text-xs">
              Total: -{formatMoney(totalContagionCostPaise)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex items-center justify-between border-b sm:border-b-0 pb-1 sm:pb-0">
              <span className="text-muted-foreground text-[11px]">Lost Supplier Early Discount</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {formatMoney(breakdown.lostDiscountPaise)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b sm:border-b-0 pb-1 sm:pb-0">
              <span className="text-muted-foreground text-[11px]">Supplier Late Penalties / Halt Fees</span>
              <span className="font-mono font-semibold tabular-nums text-destructive">
                {formatMoney(breakdown.supplierHaltFeesPaise)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b sm:border-b-0 pb-1 sm:pb-0">
              <span className="text-muted-foreground text-[11px]">Secondary Customer SLA Penalties</span>
              <span className="font-mono font-semibold tabular-nums text-destructive">
                {formatMoney(breakdown.slaPenaltiesPaise)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">Working-Capital Float Drag</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {formatMoney(breakdown.workingCapitalDragPaise)}
              </span>
            </div>

            {breakdown.floatFeePaise > 0 && (
              <div className="flex items-center justify-between col-span-full border-t border-border/40 pt-1">
                <span className="text-muted-foreground text-[11px]">
                  Tri-Party Split-Escrow Float Fee (2%)
                </span>
                <span className="font-mono font-semibold tabular-nums text-primary">
                  {formatMoney(breakdown.floatFeePaise)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Analysis Mode: Deep Mathematical Derivations & Penalty Rates */}
        {detailedMode && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-primary font-semibold border-b border-primary/20 pb-2">
              <Calculator className="h-4 w-4" />
              <span>Mathematical Formulations & Contagion Derivations</span>
            </div>

            {/* Formulas */}
            <div className="space-y-1.5 font-mono text-[11px] bg-background/80 p-2.5 rounded border border-border/60">
              <p className="text-foreground">
                <strong>1. Paper Margin</strong> = Revenue ({formatMoney(revenuePaise)}) − Direct COGS ({formatMoney(directCogsPaise)}) = <strong>{formatMoney(paperMarginPaise)} ({paperMarginPercent}%)</strong>
              </p>
              <p className="text-destructive">
                <strong>2. Contagion Loss</strong> = Lost Discount ({formatMoney(breakdown.lostDiscountPaise)}) + Halt Fees ({formatMoney(breakdown.supplierHaltFeesPaise)}) + Secondary SLA ({formatMoney(breakdown.slaPenaltiesPaise)}) + Float Drag ({formatMoney(breakdown.workingCapitalDragPaise)}) = <strong>-{formatMoney(totalContagionCostPaise)}</strong>
              </p>
              <p className="text-primary font-bold">
                <strong>3. True Ripple Margin</strong> = Paper Margin − Contagion Loss = <strong>{formatMoney(trueRippleMarginPaise)} ({trueRippleMarginPercent}%)</strong>
              </p>
            </div>

            {/* Exact Penalty Rates */}
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Microscope className="h-3.5 w-3.5 text-primary" />
                Active Penalty Rate Breakdown:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-background/60 border border-border/50">
                  <span className="font-medium text-foreground">Supplier Halt Fee:</span>
                  <p className="text-muted-foreground mt-0.5">₹2,500/day Supplier Halt penalty begins Day 18 upon liquidity shortfall.</p>
                </div>
                <div className="p-2 rounded bg-background/60 border border-border/50">
                  <span className="font-medium text-foreground">Secondary Customer SLA:</span>
                  <p className="text-muted-foreground mt-0.5">₹3,000/day Secondary SLA breach penalty on delayed Metro Retail fulfillment.</p>
                </div>
                <div className="p-2 rounded bg-background/60 border border-border/50">
                  <span className="font-medium text-foreground">Float Drag Rate:</span>
                  <p className="text-muted-foreground mt-0.5">₹1,400/day Working-Capital Float Drag due to idle WIP and cash conversion gap.</p>
                </div>
                <div className="p-2 rounded bg-background/60 border border-border/50">
                  <span className="font-medium text-foreground">Lost Early Discount:</span>
                  <p className="text-muted-foreground mt-0.5">3% cash discount lost (₹3,600) due to inability to pay supplier on Day 18.</p>
                </div>
              </div>
            </div>

            {/* Keystone Multiplier Derivation */}
            <div className="p-2.5 rounded bg-background/60 border border-border/50 text-[11px] space-y-1">
              <span className="font-semibold text-foreground">Node-by-Node Fragility Multiplier Derivation:</span>
              <p className="text-muted-foreground leading-relaxed">
                • <strong>Apex Corp (INV-APEX)</strong>: ₹4,00,000 late payment exposes ₹80,00,000 downstream order commitments = <strong className="text-destructive">20.0x Keystone Fragility Multiplier</strong>.
                <br />
                • <strong>Kaveri Timber (PO-1)</strong>: ₹1,20,000 commitment halts ₹1,65,000 Metro Retail order = <strong className="text-amber-600 dark:text-amber-400">1.38x Contagion Multiplier</strong>.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
