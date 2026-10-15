import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Semantic tone for a metric. Drives the icon chip, and the value for risk tones. */
export type MetricIntent = "default" | "success" | "warning" | "danger" | "info";

interface MetricCardProps {
  label: string;
  /** Usually a formatted money/date string; accepts a node so badges can be used as the value. */
  value: ReactNode;
  icon: LucideIcon;
  /**
   * Short caption under the value (e.g. "6 open invoices").
   * `hint` is the legacy alias — `subtext` wins when both are supplied.
   */
  subtext?: string;
  hint?: string;
  intent?: MetricIntent;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
    sentiment?: "good" | "bad" | "neutral";
  };
}

const chipByIntent: Record<MetricIntent, string> = {
  default: "bg-primary/10 text-primary",
  info: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  danger: "bg-destructive/10 text-destructive",
};

/**
 * Only risk tones colour the headline number. A red or amber figure is a
 * financial convention that reads as "look at this"; a green or indigo
 * headline number is just noise, so those stay in foreground ink.
 */
const valueByIntent: Record<MetricIntent, string> = {
  default: "text-foreground",
  info: "text-foreground",
  success: "text-foreground",
  warning: "text-warning-foreground",
  danger: "text-destructive",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  subtext,
  hint,
  intent = "default",
  trend,
}: MetricCardProps) {
  const TrendIcon =
    trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;

  const caption = subtext ?? hint;

  const trendTone = cn(
    trend?.sentiment === "good" && "text-success",
    trend?.sentiment === "bad" && "text-destructive",
    (!trend?.sentiment || trend?.sentiment === "neutral") && "text-muted-foreground",
  );

  return (
    <Card className="group hover:shadow-elevated">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="pt-0.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {label}
          </span>
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              chipByIntent[intent],
            )}
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div
          className={cn(
            "mt-3 text-[1.6rem] leading-none font-semibold tracking-[-0.02em] tabular-nums",
            valueByIntent[intent],
          )}
        >
          {value}
        </div>
        {trend ? (
          <div className={cn("mt-2.5 flex items-center gap-1 text-xs font-medium", trendTone)}>
            <TrendIcon className="h-3.5 w-3.5" aria-hidden />
            <span>{trend.label}</span>
          </div>
        ) : caption ? (
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{caption}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
