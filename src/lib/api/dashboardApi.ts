import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay } from "@/mocks/store";
import { buildForecast } from "@/mocks/data";
import type { ForecastPoint, RiskAlert, Recommendation, CashFlowEvent } from "@/types";

export interface DashboardSummary {
  businessName?: string;
  currency?: string;
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
    (i) =>
      (!i.type || i.type === "receivable") &&
      (i.status === "sent" || i.status === "partially_paid" || i.status === "overdue"),
  );
  const receivablesPaise = openInvoices.reduce(
    (s, i) => s + (i.amountPaise - i.amountPaidPaise),
    0,
  );
  const overdueReceivablesPaise = db.invoices
    .filter((i) => (!i.type || i.type === "receivable") && i.status === "overdue")
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

  const notifs = db.notifications;
  let filteredAlerts = db.riskAlerts;
  if (notifs) {
    filteredAlerts = db.riskAlerts.filter((alert) => {
      if (
        !notifs.lowCash &&
        (alert.id === "risk_1" ||
          alert.title.toLowerCase().includes("cash shortfall") ||
          alert.title.toLowerCase().includes("low cash"))
      ) {
        return false;
      }
      if (
        !notifs.overdueInvoices &&
        (alert.id === "risk_2" || alert.title.toLowerCase().includes("overdue"))
      ) {
        return false;
      }
      if (
        !notifs.delayedDeliveries &&
        (alert.id === "risk_3" ||
          alert.title.toLowerCase().includes("delivery") ||
          alert.title.toLowerCase().includes("reorder"))
      ) {
        return false;
      }
      return true;
    });
  }

  return {
    businessName: db.business.name,
    currency: db.business.currency,
    cashOnHandPaise,
    receivablesPaise,
    payablesPaise,
    overdueReceivablesPaise,
    lowStockCount,
    openInvoiceCount: openInvoices.length,
    forecast,
    alerts: filteredAlerts,
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
    const data = await httpRequest<DashboardSummary>("/api/dashboard/summary");
    return {
      ...data,
      forecast: data?.forecast || [],
      alerts: data?.alerts || [],
      recommendations: data?.recommendations || [],
      upcomingEvents: data?.upcomingEvents || [],
    };
  },

  async getRecentActivity(): Promise<{ activities: any[] }> {
    if (DATA_MODE === "mock") {
      await delay();
      return {
        activities: db.invoices.slice(0, 5).map((inv) => ({
          id: `act_inv_${inv.id}`,
          type: "invoice",
          title: `Invoice ${inv.invoiceNumber} (${inv.type})`,
          amountPaise: inv.amountPaise,
          status: inv.status,
          date: inv.issueDate,
        })),
      };
    }
    return httpRequest<{ activities: any[] }>("/api/dashboard/recent-activity");
  },
};
