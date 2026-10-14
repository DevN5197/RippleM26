import React from "react";
import { MetricCard } from "@/components/shared/metric-card";
import { formatMoney } from "@/lib/formatters";
import { FileText, ArrowDownLeft, ArrowUpRight, AlertTriangle, Clock } from "lucide-react";
import type { InvoiceSummaryMetrics, AgingBucket } from "@/types";

interface InvoiceSummaryCardsProps {
  metrics: InvoiceSummaryMetrics;
  selectedAging?: "all" | AgingBucket | undefined;
  onSelectAging?: (aging: "all" | AgingBucket) => void;
}

export function InvoiceSummaryCards({
  metrics,
  selectedAging,
  onSelectAging,
}: InvoiceSummaryCardsProps) {
  const aging = metrics.aging;

  return (
    <div className="space-y-4">
      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Receivables"
          value={formatMoney(metrics.outstandingReceivablesPaise)}
          subtext={`Out of ${formatMoney(metrics.totalReceivablesPaise)} customer invoices`}
          icon={ArrowDownLeft}
          intent="info"
        />

        <MetricCard
          label="Total Payables"
          value={formatMoney(metrics.outstandingPayablesPaise)}
          subtext={`Out of ${formatMoney(metrics.totalPayablesPaise)} supplier bills`}
          icon={ArrowUpRight}
        />

        <MetricCard
          label="Total Overdue"
          value={formatMoney(metrics.overdueReceivablesPaise + metrics.overduePayablesPaise)}
          subtext={`${metrics.overdueInvoicesCount} invoices past due date`}
          icon={AlertTriangle}
          intent={
            metrics.overdueReceivablesPaise + metrics.overduePayablesPaise > 0
              ? "danger"
              : "default"
          }
        />

        <MetricCard
          label="Settled Payments"
          value={formatMoney(metrics.paidPaise)}
          subtext={`Across ${metrics.totalInvoices} total invoices`}
          icon={FileText}
          intent="success"
        />
      </div>

      {/* Overdue Aging Buckets Breakdown */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Overdue Aging Analysis (Receivables & Payables)
            </h3>
          </div>
          {selectedAging && selectedAging !== "all" && onSelectAging && (
            <button
              onClick={() => onSelectAging("all")}
              className="text-xs text-primary hover:underline font-medium"
            >
              Clear aging filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* 1–7 Days */}
          <div
            onClick={() => onSelectAging?.(selectedAging === "1_7" ? "all" : "1_7")}
            className={`cursor-pointer rounded-md border p-3 transition-colors ${
              selectedAging === "1_7"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">1–7 Days</span>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {aging.bucket1to7Count} inv
              </span>
            </div>
            <p className="mt-1 text-base font-bold text-foreground">
              {formatMoney(aging.bucket1to7Paise)}
            </p>
            <span className="text-[11px] text-muted-foreground">Initial follow-up</span>
          </div>

          {/* 8–30 Days */}
          <div
            onClick={() => onSelectAging?.(selectedAging === "8_30" ? "all" : "8_30")}
            className={`cursor-pointer rounded-md border p-3 transition-colors ${
              selectedAging === "8_30"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">8–30 Days</span>
              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                {aging.bucket8to30Count} inv
              </span>
            </div>
            <p className="mt-1 text-base font-bold text-foreground">
              {formatMoney(aging.bucket8to30Paise)}
            </p>
            <span className="text-[11px] text-muted-foreground">Formal notice</span>
          </div>

          {/* 31–60 Days */}
          <div
            onClick={() => onSelectAging?.(selectedAging === "31_60" ? "all" : "31_60")}
            className={`cursor-pointer rounded-md border p-3 transition-colors ${
              selectedAging === "31_60"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">31–60 Days</span>
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                {aging.bucket31to60Count} inv
              </span>
            </div>
            <p className="mt-1 text-base font-bold text-rose-600 dark:text-rose-400">
              {formatMoney(aging.bucket31to60Paise)}
            </p>
            <span className="text-[11px] text-muted-foreground">High priority</span>
          </div>

          {/* Over 60 Days */}
          <div
            onClick={() => onSelectAging?.(selectedAging === "over_60" ? "all" : "over_60")}
            className={`cursor-pointer rounded-md border p-3 transition-colors ${
              selectedAging === "over_60"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Over 60 Days</span>
              <span className="rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-900 dark:bg-rose-900/60 dark:text-rose-200">
                {aging.bucketOver60Count} inv
              </span>
            </div>
            <p className="mt-1 text-base font-bold text-rose-700 dark:text-rose-300">
              {formatMoney(aging.bucketOver60Paise)}
            </p>
            <span className="text-[11px] text-muted-foreground">Critical recovery</span>
          </div>
        </div>
      </div>
    </div>
  );
}
