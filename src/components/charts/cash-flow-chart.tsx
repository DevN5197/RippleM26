import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatMoneyCompact, formatMoney } from "@/lib/formatters";
import type { ForecastPoint } from "@/types";

interface CashFlowChartProps {
  data: ForecastPoint[];
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ForecastPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">
        {format(parseISO(point.date), "d MMM yyyy")}
      </div>
      <div className="mt-1 space-y-0.5 tabular-nums">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Balance</span>
          <span className={point.isShortfall ? "font-medium text-destructive" : "font-medium text-foreground"}>
            {formatMoney(point.projectedBalancePaise)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">In</span>
          <span className="text-success">{formatMoney(point.inflowsPaise)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Out</span>
          <span className="text-destructive">{formatMoney(point.outflowsPaise)}</span>
        </div>
      </div>
    </div>
  );
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const chartData = data.map((p) => ({
    ...p,
    balance: p.projectedBalancePaise / 100,
  }));

  return (
    <div className="h-72 w-full" role="img" aria-label="Projected cash balance over the next 30 days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
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
            tickFormatter={(v: number) => formatMoneyCompact(v * 100)}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine y={0} stroke="var(--color-destructive)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#balanceFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
