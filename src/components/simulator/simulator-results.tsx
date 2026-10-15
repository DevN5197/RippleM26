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

  return (
    <div className="space-y-4">
      {/* ── Level 1: Primary Risk Banner if Shortfall ── */}
      {hasShortfall && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full p-1.5 bg-destructive/10 text-destructive shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive">
                Cash shortage risk identified: -{formatMoney(Math.abs(shortfallPaise))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulated balance drops below safety reserve on{" "}
                <DateLabel iso={scenarioMinDate} className="inline font-medium text-foreground" />.
                {recommendations[0] ? ` Action: ${recommendations[0].title}.` : ""}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive text-xs shrink-0 font-medium"
          >
            Risk Mitigation Required
          </Badge>
        </div>
      )}

      {/* ── Level 1: Clean 4-Metric Summary Row with Subtle Dividers ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border/70 bg-card divide-y md:divide-y-0 md:divide-x divide-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* 1. Simulated Closing Cash */}
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Simulated closing
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-lg sm:text-xl font-bold font-mono tabular-nums",
                hasShortfall ? "text-destructive" : "text-foreground",
              )}
            >
              {formatMoney(scenarioClosingPaise)}
            </span>
            {deltaClosing !== 0 && (
              <MoneyAmount paise={deltaClosing} signed className="text-xs font-mono font-medium" />
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Baseline closing: {formatMoney(baselineClosingPaise)}
          </p>
        </div>

        {/* 2. Minimum Cash Balance */}
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Min cash balance
          </p>
          <p
            className={cn(
              "mt-1 text-lg sm:text-xl font-bold font-mono tabular-nums",
              scenarioMinPaise < 0
                ? "text-destructive"
                : isBelowThreshold
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground",
            )}
          >
            {formatMoney(scenarioMinPaise)}
          </p>
          <DateLabel
            iso={scenarioMinDate}
            className="mt-0.5 text-[11px] text-muted-foreground block"
          />
        </div>

        {/* 3. Change Against Baseline / Shortfall */}
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {hasShortfall ? "Cash shortfall" : "Change vs baseline"}
          </p>
          <p
            className={cn(
              "mt-1 text-lg sm:text-xl font-bold font-mono tabular-nums",
              hasShortfall
                ? "text-destructive"
                : deltaClosing < 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground",
            )}
          >
            {hasShortfall
              ? `-${formatMoney(Math.abs(shortfallPaise))}`
              : deltaClosing === 0
                ? "₹0.00"
                : deltaClosing > 0
                  ? `+${formatMoney(deltaClosing)}`
                  : `-${formatMoney(Math.abs(deltaClosing))}`}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {hasShortfall ? "Below safety threshold" : "Net scenario variance"}
          </p>
        </div>

        {/* 4. Affected Downstream Events */}
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Affected events
          </p>
          <p className="mt-1 text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
            {affectedDependencies.length}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {affectedDependencies.length === 0
              ? "No cascading shifts"
              : `${affectedDependencies.length} downstream shift${affectedDependencies.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* ── Feature B: Ripple-Adjusted True Margin Card ── */}
      {result.trueMargin && <SimulatorTrueMarginCard margin={result.trueMargin} />}

      {/* ── Level 3: Deep Risk Diagnostics & Recommendations (Expandable) ── */}
      <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <button
          type="button"
          onClick={() => setShowDiagnostics((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Risk analysis & recommendations</span>
            <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">
              · Downstream impact, ripple score & mitigation advice
            </span>
          </div>
          <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
            {showDiagnostics ? "Hide details ▲" : "View calculation & details ▼"}
          </span>
        </button>

        <div
          className={cn(
            "grid gap-4 lg:grid-cols-3 pt-3 border-t border-border/60",
            !showDiagnostics && "hidden",
          )}
        >
          {/* Affected dependencies */}
          <div className="rounded-lg border border-border/60 bg-muted/15 p-3.5 space-y-3">
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
            <p className="text-[11px] text-muted-foreground leading-snug">
              {affectedDependencies.length === 0
                ? "No downstream events are impacted by this scenario."
                : `${affectedDependencies.length} event${affectedDependencies.length !== 1 ? "s" : ""} shifted or modified`}
            </p>
            {affectedDependencies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <CheckCircle className="h-6 w-6 text-success mb-1.5" aria-hidden />
                <p className="text-xs text-muted-foreground">No cascading impacts detected</p>
              </div>
            ) : (
              <ul className="space-y-2 divide-y divide-border/40">
                {affectedDependencies.map((dep) => (
                  <li key={dep.entityId} className="pt-2 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{dep.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {dep.impactDescription}
                        </p>
                        {dep.originalDate && dep.shiftedDate && (
                          <p className="text-[10px] text-muted-foreground">
                            <DateLabel iso={dep.originalDate} className="inline" /> →{" "}
                            <DateLabel iso={dep.shiftedDate} className="inline" />
                          </p>
                        )}
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
          <div className="rounded-lg border border-border/60 bg-muted/15 p-3.5 space-y-3">
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
            <div className="flex items-baseline justify-between pt-1">
              <span className={cn("text-2xl font-bold font-mono tabular-nums", scoreSentiment)}>
                {rippleScore.totalScore}
              </span>
              <span className="text-[10px] text-muted-foreground">
                0 (no risk) – 100 (critical)
              </span>
            </div>
            <ScoreBar score={rippleScore.totalScore} />

            <div className="space-y-2.5 pt-1">
              <FactorRow
                label="Cash shortfall severity"
                value={rippleScore.cashShortfallFactor}
                max={40}
                description="Negative balance depth and safety-threshold breach"
              />
              <FactorRow
                label="Delay magnitude"
                value={rippleScore.delayMagnitudeFactor}
                max={25}
                description="Combined supplier + customer delay days"
              />
              <FactorRow
                label="Downstream count"
                value={rippleScore.downstreamCountFactor}
                max={20}
                description="Number of cascading affected events"
              />
              <FactorRow
                label="Liquidity gap"
                value={rippleScore.liquidityGapFactor}
                max={15}
                description="Difference between baseline and simulated minimums"
              />
            </div>
          </div>

          {/* Recommendations */}
          <div className="rounded-lg border border-border/60 bg-muted/15 p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <h4 className="text-xs font-semibold text-foreground">Actionable Steps</h4>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {recommendations.length} action{recommendations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Steps to protect liquidity based on scenario output.
            </p>
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={cn(
                    "rounded-md border p-2.5 space-y-1 bg-card",
                    rec.priority === "high"
                      ? "border-destructive/30"
                      : rec.priority === "medium"
                        ? "border-warning/30"
                        : "border-border/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-foreground leading-snug">{rec.title}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[9px] font-semibold uppercase tracking-wider",
                        rec.priority === "high"
                          ? "border-transparent bg-destructive/10 text-destructive"
                          : rec.priority === "medium"
                            ? "border-transparent bg-warning/15 text-warning-foreground"
                            : "border-transparent bg-muted text-muted-foreground",
                      )}
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {rec.rationale}
                  </p>
                  {rec.impactPaise !== undefined && (
                    <p className="text-[11px] font-medium text-primary">
                      Impact: {formatMoney(rec.impactPaise)}
                    </p>
                  )}
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

// ─── Canonical Timeline / Dependency View ─────────────────────────────────────────────

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

  // Use authoritative timelineNodes if provided, else construct sensible defaults
  const nodes: SimulatorTimelineNode[] = result.timelineNodes ?? (isDemo ? [
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
        badgeText: "Ripple Risk: 20x",
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
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="p-4 sm:px-6 sm:py-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" aria-hidden />
            Chronological Scenario Timeline & Dependency Graph
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive financial dependency nodes, fragility multipliers, and real-time cash flow
            rescues.
          </p>
        </div>

        {hasActiveRescue && onRevertRescues && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRevertRescues}
            className="text-xs h-7 text-muted-foreground hover:text-destructive border-dashed border-border/70"
          >
            Revert Scenario Rescues
          </Button>
        )}
      </div>

      {/* Active Rescue Banner */}
      {hasActiveRescue && (
        <div className="border-b border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Active Financial Rescue Applied:</strong> Cash flows, safety buffers, and
              margins are dynamically protected.
            </span>
          </div>
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]"
          >
            {result.hasAutoPhaseRescue ? "Auto-Phased" : "Tri-Party Escrow Locked"}
          </Badge>
        </div>
      )}

      {/* Bypass Arc Visual Banner if Split-Escrow is active */}
      {nodes.some((n) => n.hasBypassArc) && (
        <div className="border-b border-primary/20 bg-primary/5 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Lock className="h-4 w-4 text-primary shrink-0" />
            <span>Tri-Party Split-Escrow Bypass Active:</span>
            <span className="text-muted-foreground font-normal">
              {(() => {
                const srcNode = nodes.find((n) => n.hasBypassArc);
                const targetNode = nodes.find((n) => n.id === srcNode?.bypassTargetId);
                if (srcNode && targetNode) {
                  return `${srcNode.counterparty} Receivable (${srcNode.dayLabel}) directly satisfies ${targetNode.counterparty} (${targetNode.dayLabel}). Ordinary business cash outflow is ₹0.`;
                }
                return "Customer receivable directly satisfies supplier commitment with zero ordinary business cash outflow.";
              })()}
            </span>
          </div>
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20 text-[10px]"
          >
            Zero-Cash Bypass
          </Badge>
        </div>
      )}

      {/* Chronological Timeline Nodes List */}
      <div className="divide-y divide-border/60">
        {nodes.map((node) => {
          const fragility = node.fragility;
          const isStressedFragile = node.isMostFragileUnderStress;
          const isExpanded = expandedId === node.id;

          return (
            <div
              key={node.id}
              className={cn(
                "group relative transition-colors",
                isStressedFragile
                  ? "bg-purple-50/40 dark:bg-purple-950/15"
                  : node.hasBypassArc
                    ? "bg-primary/5"
                    : "hover:bg-muted/30",
              )}
            >
              {/* Row header */}
              <div className="p-3.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  {/* Sequence dot */}
                  <div className="pt-0.5 sm:pt-0 shrink-0">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full ring-4 ring-background transition-transform",
                        isStressedFragile
                          ? "bg-purple-600 ring-purple-100 dark:ring-purple-900/40"
                          : node.direction === "incoming"
                            ? "bg-emerald-500"
                            : node.direction === "outgoing"
                              ? "bg-slate-400 dark:bg-slate-600"
                              : "bg-primary",
                      )}
                    />
                  </div>

                  {/* Timing & Counterparty */}
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
                    <div className="shrink-0 w-36 sm:w-44">
                      <span className="text-xs font-mono font-medium text-muted-foreground block truncate">
                        {node.dayLabel}
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate block">
                        {node.counterparty}
                      </span>
                    </div>

                    {/* Event title & Badges */}
                    <div className="min-w-0 flex-1 mt-1 sm:mt-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-foreground truncate">
                          {node.label}
                        </span>

                        {/* Fragility Multiplier Badge */}
                        {fragility && (
                          <Badge
                            variant="outline"
                            onClick={() => onInspectNode && onInspectNode(node)}
                            className={cn(
                              "cursor-pointer text-[10px] font-semibold transition-all hover:scale-105",
                              fragility.isKeystone
                                ? "border-destructive/30 bg-destructive/10 text-destructive shadow-xs"
                                : "border-warning/30 bg-warning/10 text-warning-foreground",
                            )}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            {fragility.badgeText}
                          </Badge>
                        )}

                        {/* Purple Stress-Test Badge */}
                        {isStressedFragile && (
                          <Badge className="bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                            <Zap className="h-3 w-3 mr-1 fill-white" />
                            MOST FRAGILE UNDER STRESS
                          </Badge>
                        )}

                        {/* Node Status Badge */}
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground font-normal border-border/60"
                        >
                          {node.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 hidden md:block">
                        {node.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side: Amount + Contextual Actions + Disclosure */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <div className="text-left sm:text-right">
                    <p
                      className={cn(
                        "text-xs sm:text-sm font-semibold font-mono tabular-nums",
                        node.direction === "incoming"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground",
                      )}
                    >
                      {node.direction === "incoming"
                        ? "+"
                        : node.direction === "outgoing"
                          ? "-"
                          : ""}
                      {formatMoney(node.amountPaise)}
                    </p>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      {node.direction}
                    </span>
                  </div>

                  {/* Contextual actions: only on eligible rows! */}
                  <div className="flex items-center gap-1.5">
                    {node.isEligibleForAutoPhase && onAutoPhaseClick && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAutoPhaseClick(node)}
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5 shadow-xs font-medium"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Auto-Phase Inventory
                      </Button>
                    )}

                    {node.isEligibleForSplitEscrow && onSplitEscrowClick && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSplitEscrowClick(node)}
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5 shadow-xs font-medium"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Lock Tri-Party Split-Escrow
                      </Button>
                    )}

                    {/* Disclosure Control */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleNode(node.id)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <span className="hidden sm:inline">Inspect</span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expandable inline detail panel */}
              {isExpanded && (
                <div className="px-4 sm:px-6 py-3.5 bg-muted/20 border-t border-border/50 text-xs space-y-3 animate-in fade-in-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Event Details
                      </p>
                      <p className="text-xs text-foreground mt-1 leading-relaxed">
                        {node.description}
                      </p>
                      <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5 font-mono">
                        <p>
                          Type: <span className="text-foreground">{node.type}</span>
                        </p>
                        <p>
                          Effective Date: <span className="text-foreground">{node.date}</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Downstream Impact & Dependencies
                      </p>
                      {fragility ? (
                        <div className="mt-1 space-y-1.5">
                          <p className="text-xs text-foreground">
                            Keystone node with{" "}
                            <span className="font-semibold text-destructive">
                              {fragility.multiplier}x propagation fragility
                            </span>
                            .
                          </p>
                          {fragility.exposedOrders && fragility.exposedOrders.length > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              <span className="font-medium text-foreground">Exposed orders: </span>
                              {fragility.exposedOrders.join(", ")}
                            </div>
                          )}
                          <p className="text-[11px] text-muted-foreground">
                            Value at risk:{" "}
                            <span className="font-mono font-medium text-destructive">
                              {formatMoney(fragility.downstreamValueAtRiskPaise)}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Standard operational commitment. No critical fragility multipliers
                          assigned.
                        </p>
                      )}

                      <div className="pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onInspectNode && onInspectNode(node)}
                          className="h-7 text-xs text-primary p-0 hover:bg-transparent hover:underline flex items-center gap-1 font-medium"
                        >
                          <Info className="h-3.5 w-3.5" />
                          Inspect Downstream Dependencies
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
