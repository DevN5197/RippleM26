import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
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

  const baselineEntry = payload.find((p) => p.name === "baseline");
  const scenarioEntry = payload.find((p) => p.name === "scenario");
  const baselineVal = baselineEntry
    ? Number(Array.isArray(baselineEntry.value) ? baselineEntry.value[0] : baselineEntry.value)
    : null;
  const scenarioVal = scenarioEntry
    ? Number(Array.isArray(scenarioEntry.value) ? scenarioEntry.value[0] : scenarioEntry.value)
    : null;
  const variance = baselineVal !== null && scenarioVal !== null ? scenarioVal - baselineVal : null;

  return (
    <div className="rounded-xl border border-white/20 bg-black/95 px-3.5 py-2.5 text-xs shadow-xl min-w-56 backdrop-blur-md">
      <div className="flex items-center justify-between font-semibold text-white mb-2 pb-1.5 border-b border-white/10 text-[11px]">
        <span>{format(parseISO(label), "EEEE, d MMM yyyy")}</span>
        {scenarioVal !== null && scenarioVal < 5000 && (
          <span className="text-[10px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/40">
            {scenarioVal < 0 ? "DEFICIT" : "BUFFER RISK"}
          </span>
        )}
      </div>
      <div className="space-y-1.5 tabular-nums">
        {payload.map((entry, index) => {
          const name = String(entry.name ?? `series-${index}`);
          const raw = entry.value;
          const value = Number(Array.isArray(raw) ? (raw[0] ?? 0) : (raw ?? 0));
          const isBaseline = entry.name === "baseline";
          return (
            <div key={name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground text-[11px] font-medium">
                  {isBaseline ? "Baseline Trajectory" : "Simulated Outcome"}
                </span>
              </div>
              <span
                className={
                  value < 0
                    ? "font-mono font-bold text-red-400 text-xs"
                    : value < 5000
                      ? "font-mono font-bold text-amber-400 text-xs"
                      : "font-mono font-bold text-white text-xs"
                }
              >
                {formatMoney(Math.round(value * 100))}
              </span>
            </div>
          );
        })}

        {variance !== null && variance !== 0 && (
          <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px] font-mono">
            <span className="text-muted-foreground font-sans">Variance (Drag):</span>
            <span className={variance < 0 ? "font-bold text-red-400" : "font-bold text-emerald-400"}>
              {variance > 0 ? "+" : ""}{formatMoney(Math.round(variance * 100))}
            </span>
          </div>
        )}
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

  const minScenarioPoint = scenarioPoints.reduce<ForecastPoint | null>((acc, p) => {
    if (!acc || p.projectedBalancePaise < acc.projectedBalancePaise) return p;
    return acc;
  }, null);
  const hasShortfall =
    minScenarioPoint &&
    (minScenarioPoint.projectedBalancePaise < 500_000 || minScenarioPoint.isShortfall);

  // Compute Y-axis domain from visible series only
  const visibleValues = chartData.flatMap((d) => {
    const vals: number[] = [];
    if (showBaseline) vals.push(d.baseline);
    if (showScenario) vals.push(d.scenario);
    return vals;
  });
  const minValue = Math.min(...visibleValues, 0);
  const maxValue = Math.max(...visibleValues, 0);
  const padding = Math.max((maxValue - minValue) * 0.12, 500);

  const ariaLabel =
    view === "both"
      ? `Baseline vs simulated cash balance over ${horizonDays} days`
      : view === "baseline"
        ? `Baseline cash balance over ${horizonDays} days`
        : `Simulated cash balance over ${horizonDays} days`;

  return (
    <div className="space-y-3 w-full">
      {/* Chart Canvas: enlarged 420-460px height for clear projection visibility */}
      <div className="h-[420px] sm:h-[460px] w-full" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="sim-baselineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="sim-scenarioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hasShortfall ? "#ef4444" : "#f59e0b"} stopOpacity={0.24} />
                <stop offset="100%" stopColor={hasShortfall ? "#ef4444" : "#f59e0b"} stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              strokeOpacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={(iso: string) => format(parseISO(iso), "d MMM")}
              tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 600 }}
              tickLine={{ stroke: "#475569" }}
              axisLine={{ stroke: "#475569" }}
              minTickGap={28}
            />

            <YAxis
              tickFormatter={(v: number) => formatMoneyCompact(Math.round(v * 100))}
              tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 600 }}
              tickLine={{ stroke: "#475569" }}
              axisLine={{ stroke: "#475569" }}
              width={74}
              domain={[minValue - padding, maxValue + padding]}
            />

            <Tooltip content={(props) => <SimulatorTooltip {...props} view={view} />} />

            {/* Shaded red danger zone below ₹0 */}
            {minValue < 0 && (
              <ReferenceArea
                y1={minValue - padding}
                y2={0}
                fill="#ef4444"
                fillOpacity={0.12}
              />
            )}

            {/* Zero deficit line */}
            <ReferenceLine
              y={0}
              stroke="#ef4444"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              strokeOpacity={0.95}
              label={{
                value: "₹0 DEFICIT BREAKEVEN",
                position: "insideBottomLeft",
                fontSize: 11,
                fill: "#ef4444",
                fontWeight: 700,
              }}
            />

            {/* Safety threshold ₹5,000 */}
            <ReferenceLine
              y={5000}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              strokeOpacity={0.9}
              label={{
                value: hasShortfall
                  ? "⚠️ DEFICIT DANGER: BELOW SAFETY RESERVE"
                  : "₹5,000 Safety Buffer",
                position: "insideTopLeft",
                fontSize: 11,
                fill: hasShortfall ? "#f59e0b" : "#94a3b8",
                fontWeight: 700,
              }}
            />

            {/* Pulsing Red Target Marker at Minimum Cash Point */}
            {showScenario &&
              minScenarioPoint &&
              (minScenarioPoint.isShortfall ||
                minScenarioPoint.projectedBalancePaise < 500_000) && (
                <ReferenceDot
                  x={minScenarioPoint.date}
                  y={minScenarioPoint.projectedBalancePaise / 100}
                  isFront
                  shape={(props: any) => {
                    const { cx, cy } = props;
                    if (typeof cx !== "number" || typeof cy !== "number") return <g />;
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={10}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={2.5}
                        >
                          <animate
                            attributeName="r"
                            values="6;16;6"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.9;0.1;0.9"
                            dur="1.8s"
                            repeatCount="indefinite"
                          />
                        </circle>
                        <circle cx={cx} cy={cy} r={5} fill="#ef4444" />
                      </g>
                    );
                  }}
                />
              )}

            {showBaseline && (
              <Area
                type="monotone"
                dataKey="baseline"
                name="baseline"
                stroke="#38bdf8"
                strokeWidth={3.5}
                fill="url(#sim-baselineFill)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff", fill: "#38bdf8" }}
              />
            )}

            {showScenario && (
              <Area
                type="monotone"
                dataKey="scenario"
                name="scenario"
                stroke={hasShortfall ? "#f43f5e" : "#fbbf24"}
                strokeWidth={3.5}
                strokeDasharray={view === "scenario" ? undefined : "6 4"}
                fill="url(#sim-scenarioFill)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff", fill: hasShortfall ? "#f43f5e" : "#fbbf24" }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Legend & Status Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-2 pt-2 border-t border-white/10 gap-2">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {showBaseline && (
            <div className="flex items-center gap-2">
              <span className="h-1 w-5 bg-sky-400 rounded-full inline-block shadow-xs shadow-sky-400/50" />
              <span className="text-white font-medium">Baseline Cash Trajectory</span>
            </div>
          )}
          {showScenario && (
            <div className="flex items-center gap-2">
              <span className={`h-1 w-5 border-b-2 border-dashed ${hasShortfall ? "border-rose-500" : "border-amber-400"} inline-block`} />
              <span className={`${hasShortfall ? "text-rose-400" : "text-amber-400"} font-medium`}>
                Simulated Cash Outcome
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-0.5 w-4 border-b border-dashed border-amber-500/80 inline-block" />
            <span>₹5k Safety Buffer</span>
          </div>
          {minValue < 0 && (
            <div className="flex items-center gap-1.5 text-red-400">
              <span className="h-0.5 w-4 border-b border-dashed border-red-500 inline-block" />
              <span>₹0 Deficit Line</span>
            </div>
          )}
        </div>

        {minScenarioPoint && (
          <div className="font-mono text-[11px] text-muted-foreground">
            Min Point: <strong className={minScenarioPoint.projectedBalancePaise < 0 ? "text-red-400" : "text-white"}>{formatMoney(minScenarioPoint.projectedBalancePaise)}</strong> ({format(parseISO(minScenarioPoint.date), "d MMM")})
          </div>
        )}
      </div>
    </div>
  );
}
