import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatMoney, formatMoneyCompact } from "@/lib/formatters";
import type { ForecastPoint } from "@/types";

export type ChartView = "both" | "baseline" | "scenario";

interface SimulatorChartProps {
  baselinePoints: ForecastPoint[];
  scenarioPoints: ForecastPoint[];
  horizonDays: number;
  view: ChartView;
}

interface ChartDataPoint {
  date: string;
  baseline: number;
  scenario: number;
}

function SimulatorTooltip({
  active,
  payload,
  label,
  view,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  view: ChartView;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md min-w-40">
      <div className="font-medium text-foreground mb-1.5">
        {format(parseISO(label), "d MMM yyyy")}
      </div>
      <div className="space-y-1 tabular-nums">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground capitalize">{entry.name}</span>
            </div>
            <span
              className={
                entry.value < 0
                  ? "font-medium text-destructive"
                  : entry.value < 5000
                    ? "font-medium text-warning-foreground"
                    : "font-medium text-foreground"
              }
            >
              {formatMoney(Math.round(entry.value * 100))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimulatorChart({
  baselinePoints,
  scenarioPoints,
  horizonDays,
  view,
}: SimulatorChartProps) {
  const showBaseline = view === "both" || view === "baseline";
  const showScenario = view === "both" || view === "scenario";

  // Merge both point arrays into a unified date-keyed series
  const dateSet = new Set<string>();
  baselinePoints.forEach((p) => dateSet.add(p.date));
  scenarioPoints.forEach((p) => dateSet.add(p.date));

  const baselineMap = new Map(baselinePoints.map((p) => [p.date, p]));
  const scenarioMap = new Map(scenarioPoints.map((p) => [p.date, p]));

  const chartData: ChartDataPoint[] = Array.from(dateSet)
    .sort()
    .map((date) => ({
      date,
      baseline: (baselineMap.get(date)?.projectedBalancePaise ?? 0) / 100,
      scenario: (scenarioMap.get(date)?.projectedBalancePaise ?? 0) / 100,
    }));

  // Compute Y-axis domain from visible series only
  const visibleValues = chartData.flatMap((d) => {
    const vals: number[] = [];
    if (showBaseline) vals.push(d.baseline);
    if (showScenario) vals.push(d.scenario);
    return vals;
  });
  const minValue = Math.min(...visibleValues, 0);
  const maxValue = Math.max(...visibleValues, 0);
  const padding = Math.max((maxValue - minValue) * 0.1, 500);

  const ariaLabel =
    view === "both"
      ? `Baseline vs simulated cash balance over ${horizonDays} days`
      : view === "baseline"
        ? `Baseline cash balance over ${horizonDays} days`
        : `Simulated cash balance over ${horizonDays} days`;

  return (
    <div className="h-72 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sim-baselineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="sim-scenarioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={(iso: string) => format(parseISO(iso), "d MMM")}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />

          <YAxis
            tickFormatter={(v: number) => formatMoneyCompact(Math.round(v * 100))}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={60}
            domain={[minValue - padding, maxValue + padding]}
          />

          <Tooltip content={(props) => <SimulatorTooltip {...props} view={view} />} />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="var(--color-destructive)" strokeDasharray="4 4" />
          {/* Safety threshold ₹5,000 */}
          <ReferenceLine
            y={5000}
            stroke="var(--color-warning)"
            strokeDasharray="3 3"
            strokeOpacity={0.55}
            label={{ value: "Safety", position: "insideTopRight", fontSize: 10, fill: "var(--color-warning)" }}
          />

          {showBaseline && (
            <Area
              type="monotone"
              dataKey="baseline"
              name="baseline"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#sim-baselineFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          )}

          {showScenario && (
            <Area
              type="monotone"
              dataKey="scenario"
              name="scenario"
              stroke="var(--color-warning)"
              strokeWidth={2}
              strokeDasharray={view === "scenario" ? undefined : "5 3"}
              fill="url(#sim-scenarioFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
