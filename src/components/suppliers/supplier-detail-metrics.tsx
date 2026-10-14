import React from "react";
import { ShoppingBag, CheckCircle2, Clock, AlertTriangle, Truck } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { formatMoney } from "@/lib/formatters";
import type { SupplierDetailData } from "@/types";

interface SupplierDetailMetricsProps {
  metrics: SupplierDetailData["metrics"];
}

export function SupplierDetailMetrics({ metrics }: SupplierDetailMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        label="Total purchases"
        value={formatMoney(metrics.totalPurchasesPaise)}
        icon={ShoppingBag}
        hint={`${metrics.totalPoCount} PO${metrics.totalPoCount === 1 ? "" : "s"} issued`}
      />

      <MetricCard
        label="Total payments settled"
        value={formatMoney(metrics.totalPaymentsMadePaise)}
        icon={CheckCircle2}
        hint="Historical settled outflows"
      />

      <MetricCard
        label="Outstanding payables"
        value={formatMoney(metrics.outstandingPayablesPaise)}
        icon={Clock}
        hint={`${metrics.openPoCount} open order${metrics.openPoCount === 1 ? "" : "s"}`}
      />

      <MetricCard
        label="Overdue balance"
        value={formatMoney(metrics.overdueBalancePaise)}
        icon={AlertTriangle}
        trend={{
          direction: metrics.overdueBalancePaise > 0 ? "down" : "flat",
          label: metrics.overdueBalancePaise > 0 ? "Past due date" : "Current",
          sentiment: metrics.overdueBalancePaise > 0 ? "bad" : "good",
        }}
      />

      <MetricCard
        label="Fulfillment score"
        value={`${metrics.reliabilityScore}%`}
        icon={Truck}
        trend={{
          direction: metrics.reliabilityScore >= 80 ? "flat" : "down",
          label: `${metrics.onTimeDeliveryRate}% on-time delivery`,
          sentiment: metrics.reliabilityScore >= 80 ? "good" : "bad",
        }}
      />
    </div>
  );
}
