import { format, parseISO, formatDistanceToNow } from "date-fns";
import type { CurrencyCode } from "@/types";

/** Format an integer amount in minor units (paise) as INR with Indian grouping. */
export function formatMoney(paise: number, currency: CurrencyCode = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/** Compact money for tight spaces: ₹12.4k, ₹1.2L */
export function formatMoneyCompact(paise: number): string {
  const rupees = paise / 100;
  const sign = rupees < 0 ? "−" : "";
  const abs = Math.abs(rupees);
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatDate(iso: string, pattern = "d MMM yyyy"): string {
  return format(parseISO(iso), pattern);
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy, h:mm a");
}

export function formatRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
