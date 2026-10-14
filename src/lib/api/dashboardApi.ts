import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay } from "@/mocks/store";
import { buildForecast } from "@/mocks/data";
import type { ForecastPoint, RiskAlert, Recommendation, CashFlowEvent } from "@/types";

export interface DashboardSummary {
  cashOnHandPaise: number;
  receivablesPaise: number;
  payablesPaise: number;
  overdueReceivablesPaise: number;
  lowStockCount: number;
  openInvoiceCount: number;
  forecast: ForecastPoint[];
  alerts: RiskAlert[];
  recommendations: Recommendation[];
  upcomingEvents: CashFlowEvent[];
}

function computeSummary(): DashboardSummary {
  const forecast = buildForecast(db.cashFlowEvents, db.business.openingCashPaise);
  const cashOnHandPaise = forecast[0]?.projectedBalancePaise ?? db.business.openingCashPaise;

  const openInvoices = db.invoices.filter(
    (i) => i.status === "sent" || i.status === "partially_paid" || i.status === "overdue",
  );
  const receivablesPaise = openInvoices.reduce(
    (s, i) => s + (i.amountPaise - i.amountPaidPaise),
    0,
  );
  const overdueReceivablesPaise = db.invoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + (i.amountPaise - i.amountPaidPaise), 0);

  const payablesPaise = db.payments
    .filter((p) => p.direction === "outgoing" && p.status === "scheduled")
    .reduce((s, p) => s + p.amountPaise, 0);

  const lowStockCount = db.inventory.filter((item) => {
    const product = db.products.find((p) => p.id === item.productId);
    return product ? item.quantityOnHand < product.reorderPoint : false;
  }).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingEvents = db.cashFlowEvents
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return {
    cashOnHandPaise,
    receivablesPaise,
    payablesPaise,
    overdueReceivablesPaise,
    lowStockCount,
    openInvoiceCount: openInvoices.length,
    forecast,
    alerts: db.riskAlerts,
    recommendations: db.recommendations,
    upcomingEvents,
  };
}

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    if (DATA_MODE === "mock") {
      await delay();
      return computeSummary();
    }
    return httpRequest<DashboardSummary>("/api/dashboard/summary");
  },
};
