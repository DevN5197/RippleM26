import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SimulatorResult } from "@/lib/api/simulationApi";

interface SimulatorResultsProps {
  result: SimulatorResult;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-destructive"
      : score >= 40
        ? "bg-warning"
        : "bg-success";
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
      {/* ── Summary metric cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Baseline closing */}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Baseline closing
          </p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
            {formatMoney(baselineClosingPaise)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            No changes applied
          </p>
        </div>

        {/* Simulated closing */}
        <div
          className={cn(
            "rounded-lg border p-4",
            hasShortfall
              ? "border-destructive/40 bg-destructive/5"
              : isBelowThreshold
                ? "border-warning/40 bg-warning/5"
                : "bg-card",
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Simulated closing
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <p
              className={cn(
                "text-xl font-semibold tabular-nums",
                hasShortfall ? "text-destructive" : "text-foreground",
              )}
            >
              {formatMoney(scenarioClosingPaise)}
            </p>
            {deltaClosing !== 0 && (
              <MoneyAmount
                paise={deltaClosing}
                signed
                className="text-xs font-medium"
              />
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {hasShortfall ? "Cash deficit detected" : "With scenario applied"}
          </p>
        </div>

        {/* Min balance */}
        <div
          className={cn(
            "rounded-lg border p-4",
            scenarioMinPaise < 0
              ? "border-destructive/40 bg-destructive/5"
              : scenarioMinPaise < 500_000
                ? "border-warning/40 bg-warning/5"
                : "bg-card",
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Min cash balance
          </p>
          <p
            className={cn(
              "mt-1.5 text-xl font-semibold tabular-nums",
              scenarioMinPaise < 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {formatMoney(scenarioMinPaise)}
          </p>
          <DateLabel
            iso={scenarioMinDate}
            className="mt-0.5 text-[11px] text-muted-foreground"
          />
        </div>

        {/* Shortfall or Ripple Score */}
        {hasShortfall ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cash shortfall
            </p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-destructive">
              {formatMoney(Math.abs(shortfallPaise))}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Below zero at worst point</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Affected events
            </p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
              {affectedDependencies.length}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Downstream dependencies</p>
          </div>
        )}
      </div>

      {/* ── Bottom panel ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Affected dependencies */}
        <Card className="shadow-xs lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" aria-hidden />
              <CardTitle className="text-sm">Affected Dependencies</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {affectedDependencies.length === 0
                ? "No downstream events are impacted by this scenario."
                : `${affectedDependencies.length} event${affectedDependencies.length !== 1 ? "s" : ""} shifted or modified`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {affectedDependencies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle className="h-8 w-8 text-success mb-2" aria-hidden />
                <p className="text-sm text-muted-foreground">No cascading impacts detected</p>
              </div>
            ) : (
              <ul className="space-y-2.5 divide-y">
                {affectedDependencies.map((dep) => (
                  <li key={dep.entityId} className="pt-2.5 first:pt-0">
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
          </CardContent>
        </Card>

        {/* Ripple Impact Score */}
        <Card className="shadow-xs lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" aria-hidden />
              <CardTitle className="text-sm">Ripple Impact Score</CardTitle>
            </div>
            <CardDescription className="text-xs">
              0 = no impact · 100 = critical disruption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={cn("text-3xl font-bold tabular-nums", scoreSentiment)}>
                {rippleScore.totalScore}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold",
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
            <ScoreBar score={rippleScore.totalScore} />

            <div className="space-y-3 pt-1">
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
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="shadow-xs lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-muted-foreground" aria-hidden />
              <CardTitle className="text-sm">Recommendations</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Actionable steps based on simulation results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "rounded-md border p-3 space-y-1",
                  rec.priority === "high"
                    ? "border-destructive/20 bg-destructive/5"
                    : rec.priority === "medium"
                      ? "border-warning/20 bg-warning/5"
                      : "bg-muted/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-foreground leading-snug">{rec.title}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px] font-medium",
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
                <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.rationale}</p>
                {rec.impactPaise !== undefined && (
                  <p className="text-[11px] font-medium text-primary">
                    Impact: {formatMoney(rec.impactPaise)}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
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

// Timeline row showing baseline vs scenario date comparison
export function SimulatorEventTimeline({ result }: { result: SimulatorResult }) {
  const keyEvents = [
    { date: "Day 0", label: "Opening cash", baselineAmount: 1_000_000, scenarioAmount: 1_000_000 },
    {
      date: "Day 1",
      label: "Supplier advance (Shree Textiles)",
      baselineAmount: -500_000,
      scenarioAmount: -500_000,
    },
    {
      date: "Day 4",
      label: "Inventory receipt (100 Cotton Kurtis)",
      baselineAmount: null,
      scenarioAmount: null,
    },
    {
      date: "Day 21",
      label: "Customer receipt (Urban Threads INV-2001)",
      baselineAmount: 800_000,
      scenarioAmount:
        result.scenarioPoints.find((p) => p.inflowsPaise > 0)?.inflowsPaise ?? 800_000,
    },
  ];

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-sm">Event Timeline</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Key milestone dates — baseline vs. simulated scenario
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded bg-primary/60" />
            <span>Baseline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded bg-warning/60" />
            <span>Simulated</span>
          </div>
        </div>
        <ul className="relative space-y-3 pl-4 before:absolute before:inset-y-2 before:left-[7px] before:w-px before:bg-border">
          {keyEvents.map((event, idx) => (
            <li key={idx} className="relative flex items-start gap-3">
              <div className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground truncate">
                    {event.label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {event.baselineAmount !== null && (
                      <MoneyAmount
                        paise={event.baselineAmount}
                        signed
                        className="text-[11px]"
                      />
                    )}
                    {event.scenarioAmount !== null &&
                      event.scenarioAmount !== event.baselineAmount && (
                        <>
                          <span className="text-[10px] text-muted-foreground">→</span>
                          <MoneyAmount
                            paise={event.scenarioAmount}
                            signed
                            className="text-[11px]"
                          />
                        </>
                      )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">{event.date}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
