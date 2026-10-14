import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
    sentiment?: "good" | "bad" | "neutral";
  };
}

export function MetricCard({ label, value, icon: Icon, hint, trend }: MetricCardProps) {
  const TrendIcon =
    trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;

  return (
    <Card className="shadow-xs">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </div>
        {trend ? (
          <div
            className={cn(
              "mt-1.5 flex items-center gap-1 text-xs font-medium",
              trend.sentiment === "good" && "text-success",
              trend.sentiment === "bad" && "text-destructive",
              (!trend.sentiment || trend.sentiment === "neutral") && "text-muted-foreground",
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" aria-hidden />
            <span>{trend.label}</span>
          </div>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
