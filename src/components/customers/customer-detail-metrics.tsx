import React from "react";
import { MetricCard } from "@/components/shared/metric-card";
import { PaymentReliabilityBadge } from "@/components/shared/payment-reliability-badge";
import { formatMoney } from "@/lib/formatters";
import { Wallet, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { CustomerDetailData } from "@/types";

interface CustomerDetailMetricsProps {
  metrics: CustomerDetailData["metrics"];
}

export function CustomerDetailMetrics({ metrics }: CustomerDetailMetricsProps) {
  const rel = metrics.reliability;
  const reliabilitySubtext = rel.hasSufficientHistory
    ? `${rel.onTimeCount} on-time · ${rel.lateCount} late (${rel.transactionCount} total)`
    : "No mature settlement history";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Outstanding Balance"
        value={formatMoney(metrics.outstandingPaise)}
        subtext={`${metrics.openInvoicesCount} open invoice(s)`}
        icon={Wallet}
        intent="info"
      />

      <MetricCard
        label="Overdue Receivables"
        value={formatMoney(metrics.overdueBalancePaise)}
        subtext={`${metrics.overdueInvoicesCount} overdue invoice(s)`}
        icon={AlertTriangle}
        intent={metrics.overdueBalancePaise > 0 ? "danger" : "default"}
      />

      <MetricCard
        label="Payment Reliability"
        value={
          <div className="pt-0.5">
            <PaymentReliabilityBadge reliability={rel} size="md" showCount={false} />
          </div>
        }
        subtext={reliabilitySubtext}
        icon={ShieldCheck}
        intent={
          rel.score !== null && rel.score >= 75
            ? "success"
            : rel.score !== null && rel.score >= 60
              ? "warning"
              : "default"
        }
      />

      <MetricCard
        label="Total Settled"
        value={formatMoney(metrics.totalPaidPaise)}
        subtext={`Out of ${formatMoney(metrics.totalInvoicedPaise)} invoiced`}
        icon={CheckCircle2}
        intent="success"
      />
    </div>
  );
}
