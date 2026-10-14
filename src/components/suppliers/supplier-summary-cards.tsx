import React from "react";
import { Truck, ArrowUpFromLine, CalendarClock, AlertOctagon, ShieldAlert } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { formatMoney } from "@/lib/formatters";
import type { SupplierSummaryMetrics } from "@/types";

interface SupplierSummaryCardsProps {
  metrics: SupplierSummaryMetrics;
}

export function SupplierSummaryCards({ metrics }: SupplierSummaryCardsProps) {
  const overdueCountLabel =
    metrics.overduePayablesPaise > 0 ? "Immediate clearance needed" : "All accounts current";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        label="Active suppliers"
        value={String(metrics.activeSuppliers)}
        icon={Truck}
        trend={{
          direction: "flat",
          label: `${metrics.archivedSuppliers} archived / inactive`,
          sentiment: "neutral",
        }}
      />

      <MetricCard
        label="Total outstanding"
        value={formatMoney(metrics.totalOutstandingPayablesPaise)}
        icon={ArrowUpFromLine}
        hint="Owed on open POs and bills"
      />

      <MetricCard
        label="Due within 7 days"
        value={formatMoney(metrics.dueInSevenDaysPaise)}
        icon={CalendarClock}
        hint="Immediate cash outflows"
      />

      <MetricCard
        label="Overdue payables"
        value={formatMoney(metrics.overduePayablesPaise)}
        icon={AlertOctagon}
        trend={{
          direction: metrics.overduePayablesPaise > 0 ? "down" : "flat",
          label: overdueCountLabel,
          sentiment: metrics.overduePayablesPaise > 0 ? "bad" : "good",
        }}
      />

      <MetricCard
        label="At-risk suppliers"
        value={String(metrics.atRiskSuppliersCount)}
        icon={ShieldAlert}
        trend={{
          direction: metrics.atRiskSuppliersCount > 0 ? "down" : "flat",
          label:
            metrics.atRiskSuppliersCount > 0
              ? `${metrics.atRiskSuppliersCount} require review`
              : "All vendors healthy",
          sentiment: metrics.atRiskSuppliersCount > 0 ? "bad" : "good",
        }}
      />
    </div>
  );
}
