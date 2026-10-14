import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentReliabilityCategory, PaymentReliabilityResult } from "@/types";
import { ShieldCheck, ShieldAlert, ShieldX, HelpCircle, Shield } from "lucide-react";

interface PaymentReliabilityBadgeProps {
  reliability?: PaymentReliabilityResult | undefined;
  score?: number | null | undefined;
  category?: PaymentReliabilityCategory | undefined;
  transactionCount?: number | undefined;
  showCount?: boolean | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
}

export function PaymentReliabilityBadge({
  reliability,
  score: propScore,
  category: propCategory,
  transactionCount: propCount,
  showCount = true,
  size = "md",
  className,
}: PaymentReliabilityBadgeProps) {
  const score = reliability?.score ?? propScore;
  const category: PaymentReliabilityCategory =
    reliability?.category ?? propCategory ?? (score !== null && score !== undefined ? "Fair" : "Insufficient payment history");
  const count = reliability?.transactionCount ?? propCount;

  // Visual tones
  let colorClass = "border-muted-foreground/30 bg-muted/60 text-muted-foreground";
  let Icon = HelpCircle;

  switch (category) {
    case "Excellent":
      colorClass = "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
      Icon = ShieldCheck;
      break;
    case "Good":
      colorClass = "border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
      Icon = Shield;
      break;
    case "Fair":
      colorClass = "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
      Icon = Shield;
      break;
    case "Poor":
      colorClass = "border-orange-500/30 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300";
      Icon = ShieldAlert;
      break;
    case "Very poor":
      colorClass = "border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
      Icon = ShieldX;
      break;
    case "Insufficient payment history":
    default:
      colorClass = "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
      Icon = HelpCircle;
      break;
  }

  const isInsufficient = category === "Insufficient payment history" || score === null || score === undefined;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge
        variant="outline"
        className={cn(
          "font-medium inline-flex items-center gap-1 px-2 py-0.5",
          colorClass,
          size === "sm" && "text-xs px-1.5 py-0",
          size === "lg" && "text-sm px-2.5 py-1"
        )}
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", size === "sm" && "h-3 w-3", size === "lg" && "h-4 w-4")} />
        {isInsufficient ? (
          <span>Insufficient payment history</span>
        ) : (
          <span>
            {category} ({score}/100)
          </span>
        )}
      </Badge>
      {showCount && count !== undefined && count > 0 && (
        <span className="text-xs text-muted-foreground">
          ({count} {count === 1 ? "txn" : "txns"})
        </span>
      )}
    </div>
  );
}
