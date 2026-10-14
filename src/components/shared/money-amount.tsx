import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types";

interface MoneyAmountProps {
  paise: number;
  currency?: CurrencyCode;
  /** Show +/− sign and color-code direction. */
  signed?: boolean;
  className?: string;
}

export function MoneyAmount({ paise, currency = "INR", signed, className }: MoneyAmountProps) {
  const sign = signed ? (paise > 0 ? "+" : paise < 0 ? "−" : "") : "";
  return (
    <span
      className={cn(
        "tabular-nums",
        signed && paise > 0 && "text-success",
        signed && paise < 0 && "text-destructive",
        className,
      )}
    >
      {sign}
      {formatMoney(Math.abs(paise), currency)}
    </span>
  );
}
