import { Link } from "@tanstack/react-router";
import { FlaskConical, TrendingUp, TrendingDown, X, Info, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/formatters";
import type { ForecastScenarioComparison } from "@/types";

interface CashFlowScenarioBannerProps {
  scenario: ForecastScenarioComparison;
  onClearScenario: () => void;
}

export function CashFlowScenarioBanner({ scenario, onClearScenario }: CashFlowScenarioBannerProps) {
  const isPositiveDelta = scenario.minBalanceDifferencePaise >= 0;

  return (
    <Card className="border-primary/40 bg-primary/5 shadow-xs">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 border-primary/30 bg-primary/10 text-primary font-semibold text-xs"
            >
              <FlaskConical className="h-3 w-3" />
              Scenario Comparison Active
            </Badge>
            <span className="font-semibold text-foreground text-sm">{scenario.scenarioName}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 gap-1"
            >
              <Link
                to="/simulator"
                search={{
                  eventId: scenario.targetEventId,
                  eventName: scenario.scenarioName,
                }}
              >
                <span>Edit in Simulator</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearScenario}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              <span>Reset Baseline</span>
            </Button>
          </div>
        </div>

        {/* Assumptions narrative */}
        <div className="flex items-start gap-2 rounded-md bg-card/80 border p-2.5 text-xs">
          <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground">Assumptions: </span>
            <span className="text-muted-foreground">{scenario.assumptions}</span>
          </div>
        </div>

        {/* Metrics comparison grid */}
        <div className="grid gap-3 sm:grid-cols-4 pt-1">
          <div className="rounded border bg-card p-2.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Baseline Min Cash
            </span>
            <span
              className={`text-base font-bold tabular-nums block mt-0.5 ${
                scenario.baselineMinBalancePaise < 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatMoney(scenario.baselineMinBalancePaise)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              on {formatDate(scenario.baselineMinBalanceDate)}
            </span>
          </div>

          <div className="rounded border bg-card p-2.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Scenario Min Cash
            </span>
            <span
              className={`text-base font-bold tabular-nums block mt-0.5 ${
                scenario.scenarioMinBalancePaise < 0 ? "text-destructive" : "text-primary"
              }`}
            >
              {formatMoney(scenario.scenarioMinBalancePaise)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              on {formatDate(scenario.scenarioMinBalanceDate)}
            </span>
          </div>

          <div className="rounded border bg-card p-2.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Liquidity Difference
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {isPositiveDelta ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={`text-base font-bold tabular-nums ${
                  isPositiveDelta ? "text-success" : "text-destructive"
                }`}
              >
                {isPositiveDelta ? "+" : "−"}
                {formatMoney(Math.abs(scenario.minBalanceDifferencePaise))}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {isPositiveDelta ? "Cash buffer improvement" : "Working capital tightening"}
            </span>
          </div>

          <div className="rounded border bg-card p-2.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Buffer Breaches
            </span>
            <div className="text-base font-bold tabular-nums mt-0.5 text-foreground">
              <span className="text-muted-foreground line-through mr-1">
                {scenario.baselineBreachDates.length}d
              </span>
              <span
                className={
                  scenario.scenarioBreachDates.length === 0 ? "text-success" : "text-warning"
                }
              >
                {scenario.scenarioBreachDates.length}d
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {scenario.scenarioBreachDates.length < scenario.baselineBreachDates.length
                ? `${scenario.baselineBreachDates.length - scenario.scenarioBreachDates.length} breach days resolved`
                : "Breach status"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
