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
  // inventory
  healthy: "success",
  low_stock: "warning",
  stockout_risk: "danger",
  out_of_stock: "danger",
  incoming_stock: "info",
  // orders & shipments
  confirmed: "info",
  partially_received: "warning",
  received: "success",
  fulfilled: "success",
  delayed: "danger",
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
  partially_received: "Partially received",
  low_stock: "Low stock",
  stockout_risk: "Stockout risk",
  out_of_stock: "Out of stock",
  incoming_stock: "Incoming stock",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = toneByStatus[status] ?? "neutral";
  const formattedDefault = status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const label = labelByStatus[status] ?? formattedDefault;
  return (
    <Badge variant="outline" className={cn("font-medium", toneClasses[tone])}>
      {label}
    </Badge>
  );
}
