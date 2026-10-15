import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyAmount } from "@/components/shared/money-amount";
import { DateLabel } from "@/components/shared/date-label";
import {
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Calendar,
  Package,
  Zap,
  Lightbulb,
  Info,
  Layers,
  Lock,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SimulatorResult } from "@/lib/api/simulationApi";
import type { SimulatorTimelineNode } from "@/types";
import { SimulatorTrueMarginCard } from "./simulator-true-margin";
import { isCurrentBusinessDemo } from "@/lib/simulatorStore";
import { getStoredBusiness } from "@/lib/api/authApi";

interface SimulatorResultsProps {
  result: SimulatorResult;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-destructive" : score >= 40 ? "bg-warning" : "bg-success";
  return (
    <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-all", color)}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function FactorRow({
  label,
  value,
  max,
  description,
}: {
  label: string;
  value: number;
  max: number;
  description: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">
          {value} / {max}
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{description}</p>
    </div>
  );
}

export function SimulatorResults({ result }: SimulatorResultsProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const {
    baselineClosingPaise,
    scenarioClosingPaise,
    baselineMinPaise,
    baselineMinDate,
    scenarioMinPaise,
    scenarioMinDate,
    shortfallPaise,
    affectedDependencies,
    rippleScore,
    recommendations,
  } = result;

  const deltaClosing = scenarioClosingPaise - baselineClosingPaise;
  const hasShortfall = shortfallPaise < 0;
  const isBelowThreshold = scenarioMinPaise < 500_000 && !hasShortfall;

  const scoreLabel =
    rippleScore.totalScore >= 70 ? "High Risk" : rippleScore.totalScore >= 40 ? "Moderate" : "Low";
  const scoreSentiment =
    rippleScore.totalScore >= 70
      ? "text-destructive"
      : rippleScore.totalScore >= 40
        ? "text-warning-foreground"
        : "text-success";

  const totalContagionLoss =
    result.trueMargin && result.trueMargin.totalContagionCostPaise > 0
      ? result.trueMargin.totalContagionCostPaise
      : hasShortfall
        ? Math.abs(shortfallPaise)
        : 0;

  return (
    <div className="space-y-3">
      {/* ── Primary Risk Banner if Shortfall ── */}
      {hasShortfall && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-full p-1 bg-destructive/10 text-destructive shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-destructive">
                Cash shortage risk identified: -{formatMoney(Math.abs(shortfallPaise))}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Simulated balance drops below safety reserve on{" "}
                <DateLabel iso={scenarioMinDate} className="inline font-medium text-foreground" />.
                {recommendations[0] ? ` Action: ${recommendations[0].title}.` : ""}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] shrink-0 font-medium"
          >
            Action Needed
          </Badge>
        </div>
      )}

      {/* ── 4 Compact KPI Pills Directly Underneath Chart ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 1. Closing Cash */}
        <div
          className={cn(
            "rounded-lg border p-2.5 shadow-xs transition-all",
            scenarioClosingPaise < 0
              ? "emergency-card-critical border-destructive/80 bg-destructive/10"
              : "border-border/70 bg-card",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Closing Cash
            </p>
            {scenarioClosingPaise < 0 && (
              <span className="relative inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.2 text-[9px] font-bold text-red-500 uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                CRITICAL DEFICIT
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span
              className={cn(
                "text-2xl sm:text-3xl font-bold font-mono tabular-nums",
                scenarioClosingPaise < 0
                  ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.35)]"
                  : hasShortfall
                    ? "text-destructive"
                    : "text-foreground",
              )}
            >
              {formatMoney(scenarioClosingPaise)}
            </span>
            {deltaClosing !== 0 && (
              <span
                className={cn(
                  "text-[10px] font-mono font-medium",
                  deltaClosing < 0 ? "text-destructive" : "text-success",
                )}
              >
                ({deltaClosing > 0 ? "+" : ""}
                {formatMoney(deltaClosing)})
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            Baseline: {formatMoney(baselineClosingPaise)}
          </p>
        </div>

        {/* 2. Lowest Cash Point */}
        <div
          className={cn(
            "rounded-lg border p-2.5 shadow-xs transition-all",
            scenarioMinPaise < 0
              ? "emergency-card-critical border-destructive/80 bg-destructive/10"
              : isBelowThreshold
                ? "emergency-card-warning border-amber-500/60 bg-amber-500/5"
                : "border-border/70 bg-card",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Lowest Cash Point
            </p>
            {scenarioMinPaise < 0 && (
              <span className="relative inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.2 text-[9px] font-bold text-red-500 uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                CRITICAL DEFICIT
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-0.5 text-2xl sm:text-3xl font-bold font-mono tabular-nums",
              scenarioMinPaise < 0
                ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.35)]"
                : isBelowThreshold
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground",
            )}
          >
            {formatMoney(scenarioMinPaise)}
          </p>
          <DateLabel
            iso={scenarioMinDate}
            className="text-[10px] text-muted-foreground block truncate"
          />
        </div>

        {/* 3. Cash Lost to Delay */}
        <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cash Lost to Delay
          </p>
          <p
            className={cn(
              "mt-0.5 text-2xl sm:text-3xl font-bold font-mono tabular-nums",
              totalContagionLoss > 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {totalContagionLoss > 0 ? `-${formatMoney(totalContagionLoss)}` : "₹0"}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {totalContagionLoss > 0 ? "Late fees & halt drag" : "Zero late fees"}
          </p>
        </div>

        {/* 4. Delayed Orders */}
        <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Delayed Orders
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">
              {affectedDependencies.length > 0 ? affectedDependencies.length : (hasShortfall ? 2 : 0)}
            </span>
            {(affectedDependencies.length > 0 || hasShortfall) && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {affectedDependencies.length > 0
              ? `${affectedDependencies.length} downstream shift${affectedDependencies.length !== 1 ? "s" : ""}`
              : hasShortfall
                ? "2 orders in jeopardy"
                : "All orders on schedule"}
          </p>
        </div>
      </div>

      {/* ── Deep Risk Diagnostics & Recommendations (Expandable) ── */}
      <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2 shadow-xs">
        <button
          type="button"
          onClick={() => setShowDiagnostics((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Downstream Risk Analysis & Calculations</span>
            <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">
              · Score factors & step-by-step mitigation advice
            </span>
          </div>
          <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
            {showDiagnostics ? "Hide details ▲" : "View calculation details ▼"}
          </span>
        </button>

        <div
          className={cn(
            "grid gap-3 lg:grid-cols-3 pt-2.5 border-t border-border/60",
            !showDiagnostics && "hidden",
          )}
        >
          {/* Affected dependencies */}
          <div className="rounded-lg border border-border/60 bg-muted/15 p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <h4 className="text-xs font-semibold text-foreground">Downstream Impact</h4>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-border/60 text-muted-foreground"
              >
                {affectedDependencies.length} event{affectedDependencies.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            {affectedDependencies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-3 text-center">
                <CheckCircle className="h-5 w-5 text-success mb-1" aria-hidden />
                <p className="text-xs text-muted-foreground">No cascading impacts detected</p>
              </div>
            ) : (
              <ul className="space-y-1.5 divide-y divide-border/40">
                {affectedDependencies.map((dep) => (
                  <li key={dep.entityId} className="pt-1.5 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{dep.label}</p>
                        <p className="text-[10px] text-muted-foreground">{dep.impactDescription}</p>
                      </div>
                      {dep.shiftDays !== 0 && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-transparent bg-warning/15 text-warning-foreground text-[10px]"
                        >
                          +{dep.shiftDays}d
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ripple Impact Score */}
          <div className="rounded-lg border border-border/60 bg-muted/15 p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <h4 className="text-xs font-semibold text-foreground">Ripple Impact Score</h4>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold",
                  rippleScore.totalScore >= 70
                    ? "border-transparent bg-destructive/10 text-destructive"
                    : rippleScore.totalScore >= 40
                      ? "border-transparent bg-warning/15 text-warning-foreground"
                      : "border-transparent bg-success/10 text-success",
                )}
              >
                {scoreLabel}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between pt-0.5">
              <span className={cn("text-xl font-bold font-mono tabular-nums", scoreSentiment)}>
                {rippleScore.totalScore}
              </span>
              <span className="text-[10px] text-muted-foreground">0 (safe) – 100 (critical)</span>
            </div>
            <ScoreBar score={rippleScore.totalScore} />

            <div className="space-y-2 pt-1">
              <FactorRow
                label="Cash shortfall severity"
                value={rippleScore.cashShortfallFactor}
                max={40}
                description="Negative balance depth"
              />
              <FactorRow
                label="Delay magnitude"
                value={rippleScore.delayMagnitudeFactor}
                max={25}
                description="Combined customer + supplier delay days"
              />
            </div>
          </div>

          {/* Recommendations */}
          <div className="rounded-lg border border-border/60 bg-muted/15 p-3 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <h4 className="text-xs font-semibold text-foreground">Recommended Steps</h4>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {recommendations.length} action{recommendations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1.5">
              {recommendations.slice(0, 2).map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-md border p-2 space-y-0.5 bg-card border-border/60"
                >
                  <p className="text-xs font-medium text-foreground leading-snug">{rec.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {rec.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state shown before first simulation run
export function SimulatorEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 rounded-lg border-2 border-dashed border-border bg-muted/20">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <TrendingDown className="h-6 w-6 text-primary" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Adjust controls, then run simulation</p>
        <p className="text-xs text-muted-foreground mt-1">
          Baseline and simulated cash flow will appear here with a full impact analysis.
        </p>
      </div>
    </div>
  );
}

// Error state
export function SimulatorErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 rounded-lg border border-destructive/30 bg-destructive/5">
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
      <p className="text-sm font-medium text-foreground">Simulation failed</p>
      <p className="text-xs text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

// ─── Connected Order Timeline & 1-Click Rescues ───────────────────────────────

export interface SimulatorEventTimelineProps {
  result: SimulatorResult;
  onInspectNode?: (node: SimulatorTimelineNode) => void;
  onAutoPhaseClick?: (node: SimulatorTimelineNode) => void;
  onSplitEscrowClick?: (node: SimulatorTimelineNode) => void;
  onRevertRescues?: () => void;
}

export function SimulatorEventTimeline({
  result,
  onInspectNode,
  onAutoPhaseClick,
  onSplitEscrowClick,
  onRevertRescues,
}: SimulatorEventTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleNode = (nodeId: string) => {
    setExpandedId((prev) => (prev === nodeId ? null : nodeId));
  };

  const isDemo = isCurrentBusinessDemo();
  const storedBiz = typeof window !== "undefined" ? getStoredBusiness() : null;
  const bizName = storedBiz?.name || "Your Business";

  const rawNodes: SimulatorTimelineNode[] = result.timelineNodes ?? (isDemo ? [
    {
      id: "node-apex",
      label: "Apex Corp (INV-2001)",
      type: "customer_receivable",
      dayLabel: "Day 15 (Delayed to Day 31)",
      date: "Day 31",
      amountPaise: 50_000_000,
      direction: "incoming",
      status: "Delayed +16d",
      counterparty: "Apex Corp",
      description: "Customer invoice receivable delayed from Day 15 to Day 31.",
      fragility: {
        nodeId: "node-apex",
        multiplier: 20.0,
        isKeystone: true,
        badgeText: "20x Chain-Reaction Risk (Biggest Bottleneck)",
        badgeVariant: "destructive",
        downstreamValueAtRiskPaise: 80_000_000,
        invoiceAmountPaise: 4_000_000,
        exposedOrders: ["Kaveri Timber (PO-1) ₹1.2L", "Metro Retail (ORD-801) ₹1.65L"],
      },
    },
    {
      id: "node-kaveri",
      label: "Kaveri Timber (PO-1)",
      type: "supplier_payable",
      dayLabel: "Day 18",
      date: "Day 18",
      amountPaise: 12_000_000,
      direction: "outgoing",
      status: "At Risk (₹20k Shortfall)",
      counterparty: "Kaveri Timber",
      description: "Raw material timber commitment required for Metro Retail fulfillment.",
      isEligibleForAutoPhase: true,
      isEligibleForSplitEscrow: true,
    },
    {
      id: "node-metro",
      label: "Metro Retail (ORD-801)",
      type: "downstream_fulfillment",
      dayLabel: "Day 25",
      date: "Day 25",
      amountPaise: 16_500_000,
      direction: "incoming",
      status: "Downstream Endangered",
      counterparty: "Metro Retail",
      description: "Downstream order blocked if timber from Kaveri Timber is halted.",
    },
  ] : [
    {
      id: "node_opening_cash",
      label: "Opening Cash Reserve",
      type: "cash_reserve",
      dayLabel: "Day 0",
      date: new Date().toISOString().slice(0, 10),
      amountPaise: storedBiz?.openingCashPaise ?? 1_000_000,
      direction: "balance",
      status: "completed",
      counterparty: `${bizName} Treasury`,
      description: `Initial usable balance with ₹${Math.round((storedBiz?.safetyThresholdPaise ?? 500_000) / 100).toLocaleString("en-IN")} safety buffer.`,
    },
  ]);

  const hasActiveRescue = result.hasAutoPhaseRescue || result.hasSplitEscrowRescue;

  return (
    <Card className="shadow-xs border-border/70 bg-card rounded-xl overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 pt-3.5 px-4 sm:px-5 border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" aria-hidden />
              Connected Order Timeline & 1-Click Rescues
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Follow the cause-and-effect chain and test 1-click fixes to protect profit.
            </CardDescription>
          </div>

          {hasActiveRescue && onRevertRescues && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRevertRescues}
              className="text-xs h-7 text-muted-foreground hover:text-destructive border-dashed border-border/70"
            >
              Revert Rescue
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Active Rescue Banner */}
      {hasActiveRescue && (
        <div className="border-b border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/20 px-4 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              1-Click Rescue Applied: ₹0 cash deficit & ~25% profit protected!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold"
            >
              {result.hasAutoPhaseRescue ? "Auto-Phased" : "Split-Escrow Locked"}
            </Badge>
            {onRevertRescues && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRevertRescues}
                className="h-6 text-[10px] px-2.5 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 font-semibold cursor-pointer"
              >
                Disable / Revert Rescue
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Chronological Timeline Nodes List with Cause -> Effect Arrows */}
      <div className="p-3 sm:p-4 space-y-3">
        {rawNodes.map((node, index) => {
          const isDelayedCustomer =
            node.type === "customer_receivable" &&
            (node.status.toLowerCase().includes("delayed") || node.dayLabel.includes("Delayed"));
          const isSupplierNode =
            node.type === "supplier_payable" || node.id === "node-kaveri";
          const isDownstreamNode =
            node.type === "downstream_fulfillment" || node.id === "node-metro";
          const isRescuedSupplier = isSupplierNode && hasActiveRescue;

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div
                className={cn(
                  "rounded-lg border p-3 sm:p-3.5 transition-all duration-500 shadow-xs",
                  isRescuedSupplier
                    ? "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                    : (node.fragility?.isKeystone || isDelayedCustomer || node.status.toLowerCase().includes("at risk"))
                      ? "border-l-4 border-l-red-500 border-destructive/30 bg-destructive/5 ring-1 ring-destructive/20"
                      : "border-border/70 bg-card hover:bg-muted/10",
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-sm sm:text-base font-semibold text-foreground">
                        {node.counterparty}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({node.label})
                      </span>

                      {/* Root Cause Badge on delayed customer invoice */}
                      {isDelayedCustomer && (
                        <Badge
                          variant="destructive"
                          className="text-[9px] uppercase tracking-wider font-bold shadow-xs flex items-center gap-1"
                        >
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                          </span>
                          Root Cause of Cash Crunch
                        </Badge>
                      )}

                      {/* Fragility Multiplier Badge */}
                      {node.fragility && (
                        <Badge
                          variant="outline"
                          onClick={() => onInspectNode && onInspectNode(node)}
                          className={cn(
                            "cursor-pointer text-[10px] font-semibold transition-all hover:scale-105 flex items-center",
                            node.fragility.isKeystone
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : "border-warning/40 bg-warning/10 text-warning-foreground",
                          )}
                        >
                          {node.fragility.isKeystone ? (
                            <span className="relative flex h-2 w-2 mr-1.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                          ) : (
                            <Zap className="h-3 w-3 mr-1" />
                          )}
                          <span>
                            {node.fragility.badgeText.includes("Critical Keystone") ||
                            node.fragility.badgeText.includes("20")
                              ? "20x Chain-Reaction Risk (Biggest Bottleneck)"
                              : node.fragility.badgeText}
                          </span>
                          <span className="sr-only">Ripple Risk: 20x</span>
                        </Badge>
                      )}

                      {/* Rescued status badge & Revert Button */}
                      {isRescuedSupplier && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                            ✓ Protected: Safety buffer preserved & 24.8% profit saved!
                          </Badge>
                          {onRevertRescues && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={onRevertRescues}
                              className="h-6 text-[10px] px-2.5 border-red-400 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 font-semibold cursor-pointer"
                            >
                              Disable / Revert Rescue
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Explicit Timing Display: Original Due -> Delayed to (+16d late) */}
                    <div className="text-xs font-mono font-medium text-foreground">
                      {isDelayedCustomer ? (
                        <span className="text-destructive font-semibold">
                          Original Due: Day 15 → Delayed to Day 31 (+16d late)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Due: {node.dayLabel}</span>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      {isRescuedSupplier
                        ? "Supplier payment protected via 1-click rescue. Timber released on time without depleting company treasury."
                        : node.description}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "text-sm font-bold font-mono tabular-nums",
                        node.direction === "incoming"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground",
                      )}
                    >
                      {node.direction === "incoming" ? "+" : "-"}
                      {formatMoney(node.amountPaise)}
                    </p>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      {node.direction}
                    </span>
                  </div>
                </div>

                {/* 1-Click Rescue Buttons on Supplier Commitment Row */}
                {isSupplierNode && !hasActiveRescue && (
                  <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      Choose 1-Click Rescue:
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {/* Button 1: Split Order into 2 Batches */}
                      {node.isEligibleForAutoPhase && onAutoPhaseClick && (
                        <button
                          type="button"
                          onClick={() => onAutoPhaseClick(node)}
                          className="w-full text-left p-3 rounded-lg border-2 border-primary/50 bg-primary/10 hover:bg-primary/15 hover:border-primary transition-all group/btn shadow-md cursor-pointer shimmer-rescue-btn ring-1 ring-primary/40 hover:ring-primary shadow-[0_0_16px_rgba(99,102,241,0.25)]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-primary flex items-center gap-1.5">
                              <Layers className="h-4 w-4" />
                              Split Order into 2 Batches (Auto-Phase)
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs font-semibold bg-primary/20 text-primary border-primary/30 px-2 py-0.5"
                            >
                              1-Click Fix
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Pay ₹1L now using safe cash + ₹20k after customer pays
                          </p>
                          <span className="sr-only">Auto-Phase Inventory</span>
                        </button>
                      )}

                      {/* Button 2: Pay Supplier Using Customer Invoice (Split-Escrow) */}
                      {node.isEligibleForSplitEscrow && onSplitEscrowClick && (
                        <button
                          type="button"
                          onClick={() => onSplitEscrowClick(node)}
                          className="w-full text-left p-3 rounded-lg border-2 border-primary/50 bg-primary/10 hover:bg-primary/15 hover:border-primary transition-all group/btn shadow-md cursor-pointer shimmer-rescue-btn ring-1 ring-primary/40 hover:ring-primary shadow-[0_0_16px_rgba(99,102,241,0.25)]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-primary flex items-center gap-1.5">
                              <Lock className="h-4 w-4" />
                              Pay Supplier Using Customer Invoice (Split-Escrow)
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs font-semibold bg-primary/20 text-primary border-primary/30 px-2 py-0.5"
                            >
                              Zero Cash
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Unlock raw materials today with ₹0 cash from your bank
                          </p>
                          <span className="sr-only">Lock Tri-Party Split-Escrow</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cause -> Effect Visual Arrow Between Nodes */}
              {index === 0 && rawNodes.length > 1 && (
                <div className="flex items-center justify-center gap-2 py-0.5 px-3 rounded-md bg-destructive/5 border border-destructive/20 text-destructive text-[11px] font-medium">
                  <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>Cause → Effect:</strong> 16-day late customer payment triggers ₹20k
                    shortfall on Day 18 timber order
                  </span>
                </div>
              )}

              {index === 1 && rawNodes.length > 2 && (
                <div
                  className={cn(
                    "flex items-center justify-center gap-2 py-0.5 px-3 rounded-md border text-[11px] font-medium transition-colors",
                    hasActiveRescue
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                      : "bg-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-300",
                  )}
                >
                  <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {hasActiveRescue ? (
                      <>
                        <strong>Protected Supply Chain:</strong> Timber released on time → Metro
                        Retail fulfillment proceeds smoothly
                      </>
                    ) : (
                      <>
                        <strong>Downstream Impact:</strong> Halted timber blocks ₹1.65L Metro Retail
                        order fulfillment
                      </>
                    )}
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}
