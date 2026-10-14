import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneByStatus: Record<string, StatusTone> = {
  // invoices
  paid: "success",
  sent: "info",
  partially_paid: "warning",
  overdue: "danger",
  draft: "neutral",
  void: "neutral",
  // orders
  confirmed: "info",
  received: "success",
  fulfilled: "success",
  cancelled: "neutral",
  quote: "neutral",
  // payments
  completed: "success",
  scheduled: "info",
  failed: "danger",
  // risk
  critical: "danger",
  warning: "warning",
  info: "info",
};

const toneClasses: Record<StatusTone, string> = {
  success: "border-transparent bg-success/10 text-success",
  warning: "border-transparent bg-warning/15 text-warning-foreground",
  danger: "border-transparent bg-destructive/10 text-destructive",
  info: "border-transparent bg-primary/10 text-primary",
  neutral: "border-transparent bg-muted text-muted-foreground",
};

const labelByStatus: Record<string, string> = {
  partially_paid: "Partially paid",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = toneByStatus[status] ?? "neutral";
  const label = labelByStatus[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", toneClasses[tone])}>
      {label}
    </Badge>
  );
}
