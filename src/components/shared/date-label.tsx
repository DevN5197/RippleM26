import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface DateLabelProps {
  iso: string;
  pattern?: string;
  className?: string;
}

export function DateLabel({ iso, pattern, className }: DateLabelProps) {
  return (
    <time dateTime={iso} className={cn("tabular-nums", className)}>
      {formatDate(iso, pattern)}
    </time>
  );
}
