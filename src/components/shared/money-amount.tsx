import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types";

interface MoneyAmountProps {
  paise?: number;
  amountPaise?: number;
  currency?: CurrencyCode;
  /** Show +/− sign and color-code direction. */
  signed?: boolean;
  className?: string;
}

export function MoneyAmount({ paise, amountPaise, currency = "INR", signed, className }: MoneyAmountProps) {
  const valuePaise = typeof paise === "number" && !Number.isNaN(paise) 
    ? paise 
    : typeof amountPaise === "number" && !Number.isNaN(amountPaise) 
      ? amountPaise 
      : 0;
  const sign = signed ? (valuePaise > 0 ? "+" : valuePaise < 0 ? "−" : "") : "";
  return (
    <span
      className={cn(
        "tabular-nums",
        signed && valuePaise > 0 && "text-success",
        signed && valuePaise < 0 && "text-destructive",
        className,
      )}
    >
      {sign}
      {formatMoney(Math.abs(valuePaise), currency)}
    </span>
  );
}
