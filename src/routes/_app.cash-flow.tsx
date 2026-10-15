import { useState, useCallback } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { isUserAuthenticated } from "@/lib/api/authApi";
import { toast } from "sonner";
import { forecastApi } from "@/lib/api/forecastApi";
import {
  CashFlowHeader,
  type ForecastHorizon,
  type CashFlowViewMode,
} from "@/components/cash-flow/cash-flow-header";
import { CashFlowSummaryCards } from "@/components/cash-flow/cash-flow-summary-cards";
import { CashFlowScenarioBanner } from "@/components/cash-flow/cash-flow-scenario-banner";
import { CashFlowChartView } from "@/components/cash-flow/cash-flow-chart-view";
import { CashFlowLedgerView } from "@/components/cash-flow/cash-flow-ledger-view";
import { CashFlowTimelineView } from "@/components/cash-flow/cash-flow-timeline-view";
import { CashFlowSafetyDialog } from "@/components/cash-flow/cash-flow-safety-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { formatMoney } from "@/lib/formatters";
import type { ForecastResponse, SimulationScenario } from "@/types";

interface CashFlowSearchParams {
  horizon?: ForecastHorizon | undefined;
  view?: CashFlowViewMode | undefined;
  scenarioId?: string | undefined;
  threshold?: number | undefined;
}

const scenariosQuery = queryOptions({
  queryKey: ["simulations", "scenarios"],
  queryFn: () => forecastApi.getScenarios(),
});

const makeForecastQuery = (
  horizon: ForecastHorizon = 30,
  scenarioId?: string,
  thresholdPaise?: number,
) =>
  queryOptions({
    queryKey: ["forecast", { horizon, scenarioId, thresholdPaise }],
    queryFn: () =>
      forecastApi.getForecast({
        days: horizon,
        scenarioId,
        safetyThresholdPaise: thresholdPaise,
      }),
  });

export const Route = createFileRoute("/_app/cash-flow")({
  validateSearch: (search: Record<string, unknown>): CashFlowSearchParams => {
    const rawHorizon = Number(search["horizon"]);
    const validHorizons: ForecastHorizon[] = [7, 14, 30, 60, 90];
    const horizon: ForecastHorizon = validHorizons.includes(rawHorizon as ForecastHorizon)
      ? (rawHorizon as ForecastHorizon)
      : 30;

    const rawView = search["view"];
    const view: CashFlowViewMode =
      rawView === "ledger" || rawView === "timeline" ? rawView : "chart";

    const scenarioId =
      typeof search["scenarioId"] === "string" && search["scenarioId"].trim() !== ""
        ? search["scenarioId"]
        : undefined;

    const rawThreshold = Number(search["threshold"]);
    const threshold = !isNaN(rawThreshold) && rawThreshold >= 0 ? rawThreshold : undefined;

    return {
      horizon,
      view,
      scenarioId,
      threshold,
    };
  },
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token || !isUserAuthenticated()) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
    }
  },
  loader: async ({ context, location }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token || !isUserAuthenticated()) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
    }
    const rawSearch = location.search as CashFlowSearchParams;
    const horizon = rawSearch.horizon ?? 30;
    const scenarioId = rawSearch.scenarioId;
    const threshold = rawSearch.threshold;

    try {
      await Promise.all([
        context.queryClient.ensureQueryData(scenariosQuery),
        context.queryClient.ensureQueryData(makeForecastQuery(horizon, scenarioId, threshold)),
      ]);
    } catch {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Cash Flow — Ripple" },
      {
        name: "description",
        content:
          "Day-by-day cash flow forecast, daily ledger, upcoming timeline, safety threshold analysis and simulation comparison for Rupi Clothing.",
      },
      { property: "og:title", content: "Cash Flow — Ripple" },
      {
        property: "og:description",
        content: "Understand your future cash position before commitments become problems.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CashFlowPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load Cash Flow forecast"
      message={error instanceof Error ? error.message : "Failed to load forecast data."}
      onRetry={reset}
    />
  ),
});

function CashFlowPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const horizon: ForecastHorizon = search.horizon ?? 30;
  const viewMode: CashFlowViewMode = search.view ?? "chart";
  const scenarioId = search.scenarioId;
  const thresholdPaise = search.threshold;

  const [safetyDialogOpen, setSafetyDialogOpen] = useState(false);

  // Queries
  const { data: scenariosData } = useSuspenseQuery(scenariosQuery);
  const scenarios: SimulationScenario[] = scenariosData ?? [];

  const { data: forecastData, refetch } = useSuspenseQuery(
    makeForecastQuery(horizon, scenarioId, thresholdPaise),
  );
  const forecast: ForecastResponse = forecastData;

  // Handlers for URL search parameter synchronization
  const handleHorizonChange = useCallback(
    (newHorizon: ForecastHorizon) => {
      navigate({
        search: (prev) => ({
          ...prev,
          horizon: newHorizon,
        }),
      });
    },
    [navigate],
  );

  const handleViewModeChange = useCallback(
    (newView: CashFlowViewMode) => {
      navigate({
        search: (prev) => ({
          ...prev,
          view: newView,
        }),
      });
    },
    [navigate],
  );

  const handleScenarioChange = useCallback(
    (newScenarioId: string | undefined) => {
      navigate({
        search: (prev) => ({
          ...prev,
          scenarioId: newScenarioId,
        }),
      });
    },
    [navigate],
  );

  const handleSaveSafetyThreshold = async (newThresholdPaise: number) => {
    try {
      await forecastApi.updateSafetyThreshold(newThresholdPaise);
      navigate({
        search: (prev) => ({
          ...prev,
          threshold: newThresholdPaise,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["forecast"] });
      toast.success(`Safety threshold updated to ${formatMoney(newThresholdPaise)}`);
    } catch {
      toast.error("Failed to update safety threshold.");
    }
  };

  // CSV Export action
  const handleExportCsv = useCallback(() => {
    if (!forecast || !forecast.dailyLedger) return;

    const headers = [
      "Date",
      "Opening Cash (INR)",
      "Expected Inflows (INR)",
      "Other Inflows (INR)",
      "Total Inflows (INR)",
      "Supplier Payments (INR)",
      "Operating Expenses (INR)",
      "Other Outflows (INR)",
      "Total Outflows (INR)",
      "Net Movement (INR)",
      "Closing Cash (INR)",
      "Safety Buffer (INR)",
      "Shortfall (INR)",
      "Status",
      "Transactions Count",
      "Events Summary",
    ];

    const rows = forecast.dailyLedger.map((entry) => {
      const eventsSummary =
        entry.events.length === 0
          ? "No events scheduled"
          : entry.events
              .map(
                (e) =>
                  `${e.label.replace(/["\r\n,]+/g, " ")} (${e.direction === "incoming" ? "+INR " : "-INR "}${(e.amountPaise / 100).toFixed(2)})`,
              )
              .join("; ");

      return [
        entry.date,
        (entry.openingBalancePaise / 100).toFixed(2),
        (entry.expectedIncomingPaise / 100).toFixed(2),
        (entry.otherInflowsPaise / 100).toFixed(2),
        (entry.totalInflowsPaise / 100).toFixed(2),
        (entry.supplierPaymentsPaise / 100).toFixed(2),
        (entry.operatingExpensesPaise / 100).toFixed(2),
        (entry.otherOutflowsPaise / 100).toFixed(2),
        (entry.totalOutflowsPaise / 100).toFixed(2),
        (entry.netMovementPaise / 100).toFixed(2),
        (entry.closingBalancePaise / 100).toFixed(2),
        (forecast.safetyThresholdPaise / 100).toFixed(2),
        (entry.shortfallPaise / 100).toFixed(2),
        entry.status,
        entry.events.length,
        `"${eventsSummary.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `ripple-cash-flow-forecast-${horizon}d-${new Date().toISOString().slice(0, 10)}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${horizon}-day forecast to CSV (${forecast.dailyLedger.length} days)`);
  }, [forecast, horizon]);

  return (
    <div className="space-y-6">
      {/* Page Header with Horizon, View, Threshold, and Scenario controls */}
      <CashFlowHeader
        horizon={horizon}
        onHorizonChange={handleHorizonChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        safetyThresholdPaise={forecast.safetyThresholdPaise}
        onOpenSafetyDialog={() => setSafetyDialogOpen(true)}
        selectedScenarioId={scenarioId}
        onScenarioChange={handleScenarioChange}
        scenarios={scenarios}
        onExportCsv={handleExportCsv}
      />

      {/* Scenario comparison banner (when scenario active) */}
      {forecast.scenario && (
        <CashFlowScenarioBanner
          scenario={forecast.scenario}
          onClearScenario={() => handleScenarioChange(undefined)}
        />
      )}

      {/* Attention Highlight: Chart, Ledger, or Timeline first directly after info/header controls */}
      {viewMode === "chart" && <CashFlowChartView forecast={forecast} />}

      {viewMode === "ledger" && (
        <CashFlowLedgerView
          ledger={forecast.dailyLedger}
          safetyThresholdPaise={forecast.safetyThresholdPaise}
        />
      )}

      {viewMode === "timeline" && (
        <CashFlowTimelineView
          events={forecast.events}
          safetyThresholdPaise={forecast.safetyThresholdPaise}
        />
      )}

      {/* Financial Summary Metrics */}
      <div className="pt-2">
        <CashFlowSummaryCards forecast={forecast} />
      </div>

      {/* Safety Threshold configuration modal */}
      <CashFlowSafetyDialog
        open={safetyDialogOpen}
        onOpenChange={setSafetyDialogOpen}
        currentThresholdPaise={forecast.safetyThresholdPaise}
        onSave={handleSaveSafetyThreshold}
      />
    </div>
  );
}
