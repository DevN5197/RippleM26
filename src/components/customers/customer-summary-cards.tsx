import React from "react";
import { Users, AlertTriangle, Wallet, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { formatMoney } from "@/lib/formatters";
import type { CustomerSummaryMetrics } from "@/types";

interface CustomerSummaryCardsProps {
  metrics: CustomerSummaryMetrics;
}

export function CustomerSummaryCards({ metrics }: CustomerSummaryCardsProps) {
  const avgScore = metrics.averageReliabilityScore;
  const scoreLabel = avgScore !== null ? `${avgScore}/100 avg rating` : "Insufficient history";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Total Customers"
        value={metrics.totalCustomers.toString()}
        subtext={`${metrics.activeCustomers} active · ${metrics.archivedCustomers} archived`}
        icon={Users}
      />
      <MetricCard
        label="Outstanding Receivables"
        value={formatMoney(metrics.totalOutstandingPaise)}
        subtext="Total unpaid customer balances"
        icon={Wallet}
        intent="info"
      />
      <MetricCard
        label="Overdue Invoices"
        value={formatMoney(metrics.totalOverduePaise)}
        subtext={`${metrics.overdueCustomersCount} counterparty accounts overdue`}
        icon={AlertTriangle}
        intent={metrics.totalOverduePaise > 0 ? "danger" : "default"}
      />
      <MetricCard
        label="Average Payment Reliability"
        value={avgScore !== null ? `${avgScore}%` : "N/A"}
        subtext={scoreLabel}
        icon={ShieldCheck}
        intent={
          avgScore !== null && avgScore >= 75
            ? "success"
            : avgScore !== null && avgScore >= 60
              ? "warning"
              : "default"
        }
      />
    </div>
  );
}
