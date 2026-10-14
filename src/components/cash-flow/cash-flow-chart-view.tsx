import { useState, useId } from "react";
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Info, Eye, EyeOff, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatMoneyCompact } from "@/lib/formatters";
import type { ForecastResponse, ForecastPoint } from "@/types";

interface CashFlowChartViewProps {
  forecast: ForecastResponse;
}

interface ChartItem {
  date: string;
  displayDate: string;
  balance: number;
  scenarioBalance?: number;
  inflows: number;
  outflows: number;
  netMovement: number;
  isShortfall: boolean;
  shortfallAmount: number;
  isBelowThreshold: boolean;
  isHistorical: boolean;
  originalPoint: ForecastPoint;
}

function CustomTooltip({
  active,
  payload,
  label,
  safetyThresholdRupees,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartItem }>;
  label?: string;
  safetyThresholdRupees: number;
}) {
  if (!active || !payload || !payload.length) return null;
  const item: ChartItem = payload[0].payload;

  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg text-xs space-y-2 min-w-[210px]">
      <div className="flex items-center justify-between border-b pb-1.5">
        <span className="font-semibold text-foreground">
          {format(parseISO(item.date), "EEEE, d MMM yyyy")}
        </span>
        <Badge
          variant="outline"
          className={`text-[10px] py-0 px-1.5 ${
            item.isHistorical
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary border-primary/20"
          }`}
        >
          {item.isHistorical ? "Actual (Settled)" : "Forecast"}
        </Badge>
      </div>

      <div className="space-y-1 tabular-nums">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Closing Balance:</span>
          <span
            className={`font-bold ${
              item.balance < 0
                ? "text-destructive"
                : item.balance < safetyThresholdRupees
                  ? "text-warning-foreground"
                  : "text-foreground"
            }`}
          >
            {formatMoney(item.balance * 100)}
          </span>
        </div>

        {item.scenarioBalance !== undefined && (
          <div className="flex justify-between items-center text-[#8b5cf6]">
            <span>Scenario Balance:</span>
            <span className="font-bold">{formatMoney(item.scenarioBalance * 100)}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-success">
          <span className="text-muted-foreground">Inflows:</span>
          <span>+{formatMoney(item.inflows * 100)}</span>
        </div>

        <div className="flex justify-between items-center text-destructive">
          <span className="text-muted-foreground">Outflows:</span>
          <span>−{formatMoney(item.outflows * 100)}</span>
        </div>

        <div className="flex justify-between items-center pt-1 border-t text-muted-foreground">
          <span>Net Day Movement:</span>
          <span
            className={`font-semibold ${
              item.netMovement >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {item.netMovement >= 0 ? "+" : "−"}
            {formatMoney(Math.abs(item.netMovement * 100))}
          </span>
        </div>
      </div>

      {item.isBelowThreshold && (
        <div className="rounded bg-destructive/10 border border-destructive/20 p-1.5 text-[11px] text-destructive flex items-center gap-1 font-medium">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>
            {item.balance < 0
              ? `Deficit of ${formatMoney(Math.abs(item.balance * 100))}`
              : `Shortfall of ${formatMoney(item.shortfallAmount * 100)} vs buffer`}
          </span>
        </div>
      )}
    </div>
  );
}

export function CashFlowChartView({ forecast }: CashFlowChartViewProps) {
  const gradientId = useId();
  const [showBars, setShowBars] = useState(true);
  const [showNetLine, setShowNetLine] = useState(false);
  const [showThreshold, setShowThreshold] = useState(true);

  const todayIso = new Date().toISOString().slice(0, 10);
  const safetyThresholdRupees = forecast.safetyThresholdPaise / 100;

  const chartData: ChartItem[] = forecast.points.map((p) => {
    const isHistorical = p.date < todayIso;
    const balance = p.projectedBalancePaise / 100;
    const inflows = p.inflowsPaise / 100;
    const outflows = p.outflowsPaise / 100;
    const netMovement = (p.netMovementPaise ?? p.inflowsPaise - p.outflowsPaise) / 100;
    const isBelowThreshold = p.projectedBalancePaise < forecast.safetyThresholdPaise;
    const shortfallAmount = isBelowThreshold
      ? (forecast.safetyThresholdPaise - p.projectedBalancePaise) / 100
      : 0;

    return {
      date: p.date,
      displayDate: p.date,
      balance,
      scenarioBalance:
        p.scenarioBalancePaise !== undefined ? p.scenarioBalancePaise / 100 : undefined,
      inflows,
      outflows,
      netMovement,
      isShortfall: p.isShortfall,
      shortfallAmount,
      isBelowThreshold,
      isHistorical,
      originalPoint: p,
    };
  });

  const minPoint = forecast.points.reduce(
    (min, p) => (p.projectedBalancePaise < min.projectedBalancePaise ? p : min),
    forecast.points[0] ?? { projectedBalancePaise: 0, date: todayIso },
  );
  const minBalanceRupees = minPoint.projectedBalancePaise / 100;

  const hasScenario = forecast.scenario !== undefined;

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Cash Flow Projection Curve</CardTitle>
              <CardDescription className="text-xs">
                Interactive closing cash balance with scheduled inflows, commitments, and safety
                margin.
              </CardDescription>
            </div>

            {/* Chart toggle controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={showBars ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowBars(!showBars)}
                className="h-7 text-[11px] gap-1 px-2"
              >
                {showBars ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Inflows / Outflows</span>
              </Button>

              <Button
                variant={showNetLine ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowNetLine(!showNetLine)}
                className="h-7 text-[11px] gap-1 px-2"
              >
                {showNetLine ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Net Movement</span>
              </Button>

              <Button
                variant={showThreshold ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowThreshold(!showThreshold)}
                className="h-7 text-[11px] gap-1 px-2"
              >
                {showThreshold ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Safety Line</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div
            className="h-80 w-full"
            role="img"
            aria-label={`Projected cash balance over ${forecast.periodDays} days`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  tickFormatter={(iso: string) => {
                    try {
                      return format(parseISO(iso), "d MMM");
                    } catch {
                      return iso;
                    }
                  }}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />

                <YAxis
                  tickFormatter={(v: number) => formatMoneyCompact(v * 100)}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  domain={["auto", "auto"]}
                />

                <Tooltip
                  content={<CustomTooltip safetyThresholdRupees={safetyThresholdRupees} />}
                />

                <Legend
                  wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                  iconSize={10}
                  iconType="circle"
                />

                {/* Breakeven zero cash reference line */}
                <ReferenceLine
                  y={0}
                  stroke="var(--color-destructive)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: "₹0 Breakeven",
                    position: "insideTopLeft",
                    fill: "var(--color-destructive)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />

                {/* Safety threshold reference line */}
                {showThreshold && safetyThresholdRupees > 0 && (
                  <ReferenceLine
                    y={safetyThresholdRupees}
                    stroke="var(--color-warning)"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{
                      value: `Safety Buffer (${formatMoney(forecast.safetyThresholdPaise)})`,
                      position: "insideBottomLeft",
                      fill: "var(--color-warning-foreground)",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}

                {/* Highlight lowest projected balance */}
                {minPoint && (
                  <ReferenceDot
                    x={minPoint.date}
                    y={minBalanceRupees}
                    r={6}
                    fill={
                      minBalanceRupees < 0 ? "var(--color-destructive)" : "var(--color-warning)"
                    }
                    stroke="#ffffff"
                    strokeWidth={2}
                    label={{
                      value: `Min: ${formatMoney(minPoint.projectedBalancePaise)}`,
                      position: minBalanceRupees < 0 ? "bottom" : "top",
                      fill:
                        minBalanceRupees < 0
                          ? "var(--color-destructive)"
                          : "var(--color-foreground)",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}

                {/* Inflow bars */}
                {showBars && (
                  <Bar
                    dataKey="inflows"
                    name="Daily Inflows"
                    fill="var(--color-success)"
                    opacity={0.7}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={16}
                  />
                )}

                {/* Outflow bars */}
                {showBars && (
                  <Bar
                    dataKey="outflows"
                    name="Daily Outflows"
                    fill="var(--color-destructive)"
                    opacity={0.6}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={16}
                  />
                )}

                {/* Net movement line */}
                {showNetLine && (
                  <Line
                    type="monotone"
                    dataKey="netMovement"
                    name="Net Movement"
                    stroke="var(--color-warning)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}

                {/* Baseline projected closing balance Area */}
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Baseline Balance"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  activeDot={{ r: 5, strokeWidth: 1 }}
                />

                {/* Scenario comparison curve if scenario active */}
                {hasScenario && (
                  <Line
                    type="monotone"
                    dataKey="scenarioBalance"
                    name={`Scenario: ${forecast.scenario?.scenarioName}`}
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 5, fill: "#8b5cf6" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Explanatory callout explaining difference between actual and forecast data */}
          <div className="mt-4 flex flex-col sm:flex-row items-start gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-foreground">
                Actuals vs Forecast Methodology:
              </span>
              <p className="leading-relaxed">
                Dates prior to today reflect reconciled bank transactions and completed payments.
                Forecast values represent forward-looking expectations calculated from confirmed
                purchase orders, outstanding sales invoices, recurring operating expenses (payroll,
                rent, taxes), and configured safety thresholds. Curves reflect exact integer paise
                arithmetic without floating-point distortion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
