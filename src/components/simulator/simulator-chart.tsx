import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatMoney, formatMoneyCompact } from "@/lib/formatters";
import type { ForecastPoint } from "@/types";

interface SimulatorChartProps {
  baselinePoints: ForecastPoint[];
  scenarioPoints: ForecastPoint[];
  horizonDays: number;
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
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
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
              <span className="text-muted-foreground">{entry.name}</span>
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

export function SimulatorChart({ baselinePoints, scenarioPoints, horizonDays }: SimulatorChartProps) {
  // Merge baseline + scenario into a unified chart data array keyed by date
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

  const allValues = chartData.flatMap((d) => [d.baseline, d.scenario]);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const padding = (maxValue - minValue) * 0.1;

  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label={`Baseline vs simulated cash balance over ${horizonDays} days`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="baselineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="scenarioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.25} />
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

          <Tooltip content={<SimulatorTooltip />} />
          <Legend
            formatter={(value) =>
              value === "baseline" ? "Baseline" : "Simulated"
            }
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          />

          <ReferenceLine y={0} stroke="var(--color-destructive)" strokeDasharray="4 4" />
          {/* Safety threshold at ₹5,000 */}
          <ReferenceLine
            y={5000}
            stroke="var(--color-warning)"
            strokeDasharray="3 3"
            strokeOpacity={0.6}
          />

          <Area
            type="monotone"
            dataKey="baseline"
            name="baseline"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#baselineFill)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="scenario"
            name="scenario"
            stroke="var(--color-warning)"
            strokeWidth={2}
            strokeDasharray="5 3"
            fill="url(#scenarioFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
