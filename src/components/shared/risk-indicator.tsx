import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskSeverity } from "@/types";

const config: Record<RiskSeverity, { icon: typeof Info; classes: string; label: string }> = {
  critical: {
    icon: AlertCircle,
    classes: "bg-destructive/10 text-destructive",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-warning/15 text-warning-foreground",
    label: "Warning",
  },
  info: {
    icon: Info,
    classes: "bg-primary/10 text-primary",
    label: "Info",
  },
};

export function RiskIndicator({ severity }: { severity: RiskSeverity }) {
  const item = config[severity] ?? config.info;
  const { icon: Icon, classes, label } = item;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        classes,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
