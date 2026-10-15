import { Link } from "@tanstack/react-router";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  FlaskConical,
  ArrowRight,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate, formatRelative } from "@/lib/formatters";
import type { ForecastResponse, CashFlowEvent } from "@/types";

interface CashFlowSummaryCardsProps {
  forecast: ForecastResponse;
}

export function CashFlowSummaryCards({ forecast }: CashFlowSummaryCardsProps) {
  const isDeficit = forecast.minBalancePaise < 0;
  const isBreached = forecast.daysBelowThreshold > 0;
  const netPositive = forecast.netMovementPaise >= 0;

  // Identify events contributing to the minimum cash point / shortage
  const criticalEvents = forecast.events
    .filter(
      (e) =>
        e.direction === "outgoing" &&
        e.date <= forecast.minBalanceDate &&
        (e.type === "supplier_payment" || e.type === "rent" || e.amountPaise >= 500_000),
    )
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, 3);

  const topShortfallEvent: CashFlowEvent | undefined = criticalEvents[0];
  const firstBreachDate = forecast.breachDates[0];

  return (
    <div className="space-y-4">
      {/* 7 Core Financial Summary Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {/* 1. Current available cash */}
        <Card className="shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                Available Cash
              </span>
              <Wallet className="h-4 w-4" />
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-foreground">
              {formatMoney(forecast.openingBalancePaise)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Reconciled starting balance</p>
          </CardContent>
        </Card>

        {/* 2. Total projected inflows */}
        <Card className="shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-success">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Inflows
              </span>
              <ArrowDownToLine className="h-4 w-4" />
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-success">
              +{formatMoney(forecast.totalInflowsPaise)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Expected collections</p>
          </CardContent>
        </Card>

        {/* 3. Total projected outflows */}
        <Card className="shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-destructive">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Outflows
              </span>
              <ArrowUpFromLine className="h-4 w-4" />
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-destructive">
              −{formatMoney(forecast.totalOutflowsPaise)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Committed expenses & POs</p>
          </CardContent>
        </Card>

        {/* 4. Net projected cash movement */}
        <Card className="shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Net Movement
              </span>
              {netPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div
              className={`mt-1.5 text-xl font-bold tabular-nums ${
                netPositive ? "text-success" : "text-destructive"
              }`}
            >
              {netPositive ? "+" : "−"}
              {formatMoney(Math.abs(forecast.netMovementPaise))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {netPositive ? "Net cash expansion" : "Working capital contraction"}
            </p>
          </CardContent>
        </Card>

        {/* 5. Minimum projected closing balance */}
        <Card
          className={`shadow-xs ${
            isDeficit
              ? "border-destructive/40 bg-destructive/5"
              : isBreached
                ? "border-warning/40 bg-warning/5"
                : "bg-card"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Minimum Cash
              </span>
              <AlertTriangle
                className={`h-4 w-4 ${
                  isDeficit
                    ? "text-destructive"
                    : isBreached
                      ? "text-warning"
                      : "text-muted-foreground"
                }`}
              />
            </div>
            <div
              className={`mt-1.5 text-xl font-bold tabular-nums ${
                isDeficit
                  ? "text-destructive"
                  : isBreached
                    ? "text-warning-foreground"
                    : "text-foreground"
              }`}
            >
              {forecast.minBalancePaise < 0 ? "−" : ""}
              {formatMoney(Math.abs(forecast.minBalancePaise))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isDeficit
                ? "Deficit warning"
                : isBreached
                  ? "Below safety buffer"
                  : "Comfortable liquidity"}
            </p>
          </CardContent>
        </Card>

        {/* 6. Date of the minimum balance */}
        <Card className="shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                Date of Min Balance
              </span>
              <Calendar className="h-4 w-4" />
            </div>
            <div className="mt-1.5 text-base font-bold text-foreground truncate">
              {formatDate(forecast.minBalanceDate, "d MMM yyyy")}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatRelative(forecast.minBalanceDate)}
            </p>
          </CardContent>
        </Card>

        {/* 7. Days below safety threshold */}
        <Card
          className={`shadow-xs ${
            forecast.daysBelowThreshold > 0
              ? "border-warning/40 bg-warning/5"
              : "border-success/30 bg-success/5"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Days Below Buffer
              </span>
              <ShieldAlert
                className={`h-4 w-4 ${
                  forecast.daysBelowThreshold > 0 ? "text-warning" : "text-success"
                }`}
              />
            </div>
            <div
              className={`mt-1.5 text-xl font-bold tabular-nums ${
                forecast.daysBelowThreshold > 0 ? "text-warning-foreground" : "text-success"
              }`}
            >
              {forecast.daysBelowThreshold} {forecast.daysBelowThreshold === 1 ? "day" : "days"}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Threshold: {formatMoney(forecast.safetyThresholdPaise)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Safety Warning / Shortfall Banner when threshold is breached */}
      {isBreached && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  {isDeficit ? "Cash Shortfall Detected" : "Below Safety Buffer"}
                </Badge>
                <span className="text-xs font-semibold text-foreground">
                  Lowest cash point: {formatMoney(forecast.minBalancePaise)} on{" "}
                  {formatDate(forecast.minBalanceDate)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Cash drops below your {formatMoney(forecast.safetyThresholdPaise)} safety buffer
                across{" "}
                <span className="font-medium text-foreground">
                  {forecast.daysBelowThreshold} days
                </span>
                {firstBreachDate && (
                  <span>
                    {" "}
                    (first breach on{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(firstBreachDate)}
                    </span>
                    )
                  </span>
                )}
                .
                {criticalEvents.length > 0 && (
                  <span>
                    {" "}
                    Contributing commitments:{" "}
                    <span className="font-medium text-foreground">
                      {criticalEvents
                        .map((e) => `${e.label} (${formatMoney(e.amountPaise)})`)
                        .join(", ")}
                    </span>
                    .
                  </span>
                )}
              </p>
            </div>

            {topShortfallEvent && (
              <Button
                size="sm"
                variant="default"
                asChild
                className="shrink-0 gap-1.5 bg-primary text-primary-foreground shadow-xs text-xs font-medium"
              >
                <Link
                  to="/simulator"
                  search={{
                    eventId: topShortfallEvent.id,
                    eventName: topShortfallEvent.label,
                  }}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>Simulate in Ripple</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
