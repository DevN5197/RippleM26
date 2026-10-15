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
  active?: boolean | undefined;
  // Recharts hands over its own `Payload` shape, where name/value are widened
  // unions and may be absent. Mirroring that keeps the spread in <Tooltip /> legal
  // AND stops `entry.value * 100` from silently producing NaN.
  payload?:
    | Array<{
        name?: string | number | undefined;
        value?: string | number | ReadonlyArray<string | number> | undefined;
        color?: string | undefined;
      }>
    | undefined;
  label?: string | undefined;
  view: ChartView;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  return (
    <div className="rounded-lg border border-border/80 bg-card px-3 py-2 text-xs shadow-sm min-w-44">
      <div className="font-semibold text-foreground mb-1.5 pb-1 border-b border-border/40 text-[11px]">
        {format(parseISO(label), "d MMM yyyy")}
      </div>
      <div className="space-y-1 tabular-nums">
        {payload.map((entry, index) => {
          const name = String(entry.name ?? `series-${index}`);
          const raw = entry.value;
          const value = Number(Array.isArray(raw) ? (raw[0] ?? 0) : (raw ?? 0));
          return (
            <div key={name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground capitalize text-[11px]">
                  {entry.name === "baseline" ? "Baseline" : "Simulated"}
                </span>
              </div>
              <span
                className={
                  value < 0
                    ? "font-mono font-medium text-destructive"
                    : value < 5000
                      ? "font-mono font-medium text-warning-foreground"
                      : "font-mono font-medium text-foreground"
                }
              >
                {formatMoney(Math.round(value * 100))}
              </span>
            </div>
          );
        })}
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
    <div className="space-y-2">
      {/* Chart Canvas: 320px desktop height, responsive */}
      <div className="h-72 sm:h-80 w-full" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
            <defs>
              <linearGradient id="sim-baselineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="sim-scenarioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="2 2"
              stroke="var(--color-border)"
              strokeOpacity={0.4}
              vertical={false}
            />

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
              width={56}
              domain={[minValue - padding, maxValue + padding]}
            />

            <Tooltip content={(props) => <SimulatorTooltip {...props} view={view} />} />

            {/* Zero line */}
            <ReferenceLine
              y={0}
              stroke="var(--color-destructive)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            {/* Safety threshold ₹5,000 */}
            <ReferenceLine
              y={5000}
              stroke="var(--color-warning)"
              strokeDasharray="2 2"
              strokeOpacity={0.45}
              label={{
                value: "Safety buffer",
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--color-muted-foreground)",
              }}
            />

            {showBaseline && (
              <Area
                type="monotone"
                dataKey="baseline"
                name="baseline"
                stroke="var(--color-primary)"
                strokeWidth={1.5}
                fill="url(#sim-baselineFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-primary)" }}
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
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-warning)" }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Subtle Legend Bar */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1 border-t border-border/40">
        <div className="flex items-center gap-4">
          {showBaseline && (
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-primary rounded-full inline-block" />
              <span>Baseline trajectory</span>
            </div>
          )}
          {showScenario && (
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-b-2 border-dashed border-warning inline-block" />
              <span>Simulated outcome</span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/75">Safety reserve: ₹5,000</span>
      </div>
    </div>
  );
}
