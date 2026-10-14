import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { forecastApi } from "@/lib/api/forecastApi";
import { CashFlowSummaryCards } from "@/components/cash-flow/cash-flow-summary-cards";
import { CashFlowHeader } from "@/components/cash-flow/cash-flow-header";
import { CashFlowLedgerView } from "@/components/cash-flow/cash-flow-ledger-view";
import { CashFlowTimelineView } from "@/components/cash-flow/cash-flow-timeline-view";
import { CashFlowScenarioBanner } from "@/components/cash-flow/cash-flow-scenario-banner";
import { CashFlowSafetyDialog } from "@/components/cash-flow/cash-flow-safety-dialog";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children?: React.ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => {
      const href = typeof to === "string" ? to : "/";
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };
});

describe("Cash Flow Forecasting Engine", () => {
  it("generates forecast for 7, 14, 30, 60, and 90 days with correct lengths", async () => {
    const f7 = await forecastApi.getForecast(7);
    expect(f7.length).toBe(7);
    expect(f7.dailyLedger.length).toBe(7);

    const f14 = await forecastApi.getForecast(14);
    expect(f14.length).toBe(14);
    expect(f14.dailyLedger.length).toBe(14);

    const f30 = await forecastApi.getForecast(30);
    expect(f30.length).toBe(30);
    expect(f30.dailyLedger.length).toBe(30);

    const f60 = await forecastApi.getForecast(60);
    expect(f60.length).toBe(60);
    expect(f60.dailyLedger.length).toBe(60);

    const f90 = await forecastApi.getForecast(90);
    expect(f90.length).toBe(90);
    expect(f90.dailyLedger.length).toBe(90);
  });

  it("maintains strict mathematical consistency across opening, flows, and closing balance", async () => {
    const forecast = await forecastApi.getForecast(30);
    expect(
      forecast.openingBalancePaise + forecast.totalInflowsPaise - forecast.totalOutflowsPaise,
    ).toBe(forecast.closingBalancePaise);
    expect(forecast.totalInflowsPaise - forecast.totalOutflowsPaise).toBe(
      forecast.netMovementPaise,
    );

    // Each daily ledger row must balance
    for (const row of forecast.dailyLedger) {
      expect(row.openingBalancePaise + row.netMovementPaise).toBe(row.closingBalancePaise);
      expect(row.totalInflowsPaise).toBe(row.expectedIncomingPaise + row.otherInflowsPaise);
      expect(row.totalOutflowsPaise).toBe(
        row.supplierPaymentsPaise + row.operatingExpensesPaise + row.otherOutflowsPaise,
      );
    }
  });

  it("identifies minimum balance and shortfall breach dates correctly", async () => {
    const forecast = await forecastApi.getForecast({ days: 30, safetyThresholdPaise: 500_000 });
    expect(forecast.minBalanceDate).toBeDefined();
    expect(typeof forecast.minBalancePaise).toBe("number");
    expect(forecast.safetyThresholdPaise).toBe(500_000);
    expect(Array.isArray(forecast.breachDates)).toBe(true);

    if (forecast.daysBelowThreshold > 0) {
      expect(forecast.breachDates.length).toBe(forecast.daysBelowThreshold);
    }
  });

  it("evaluates simulation scenarios and calculates liquidity impact", async () => {
    const scenarios = await forecastApi.getScenarios();
    expect(scenarios.length).toBeGreaterThan(0);

    const shreeScenario = scenarios.find((s) => s.id === "sim_shree_delay");
    expect(shreeScenario).toBeDefined();

    // In a 7-day horizon, delaying Shree Textiles from Day 4 to Day 11 prevents the Day 5 shortfall
    const baseline7 = await forecastApi.getForecast({ days: 7 });
    const withScenario7 = await forecastApi.getForecast({
      days: 7,
      scenarioId: "sim_shree_delay",
    });

    expect(withScenario7.scenario).toBeDefined();
    expect(withScenario7.scenario?.scenarioId).toBe("sim_shree_delay");
    expect(withScenario7.scenario?.scenarioMinBalancePaise).toBeGreaterThan(
      baseline7.minBalancePaise,
    );
    expect(withScenario7.scenario?.minBalanceDifferencePaise).toBeGreaterThan(0);

    // Urban Threads discount acceleration scenario
    const withUrbanScenario = await forecastApi.getForecast({
      days: 30,
      scenarioId: "sim_urban_discount",
    });
    expect(withUrbanScenario.scenario?.scenarioId).toBe("sim_urban_discount");
    expect(withUrbanScenario.scenario?.targetEventId).toBe("cfe_3");
  });

  it("updates safety threshold in store", async () => {
    const res = await forecastApi.updateSafetyThreshold(1_000_000);
    expect(res.success).toBe(true);
    expect(res.safetyThresholdPaise).toBe(1_000_000);

    const forecast = await forecastApi.getForecast(30);
    expect(forecast.safetyThresholdPaise).toBe(1_000_000);

    // Reset back to default ₹5,000
    await forecastApi.updateSafetyThreshold(500_000);
  });
});

describe("Cash Flow Components", () => {
  it("renders CashFlowSummaryCards with all 7 key metrics", async () => {
    const forecast = await forecastApi.getForecast(30);
    render(<CashFlowSummaryCards forecast={forecast} />);

    expect(screen.getByText("Available Cash")).toBeInTheDocument();
    expect(screen.getByText("Total Inflows")).toBeInTheDocument();
    expect(screen.getByText("Total Outflows")).toBeInTheDocument();
    expect(screen.getByText("Net Movement")).toBeInTheDocument();
    expect(screen.getByText("Minimum Cash")).toBeInTheDocument();
    expect(screen.getByText("Date of Min Balance")).toBeInTheDocument();
    expect(screen.getByText("Days Below Buffer")).toBeInTheDocument();
  });

  it("renders CashFlowHeader with horizon and view selectors", async () => {
    const scenarios = await forecastApi.getScenarios();
    const onHorizonChange = vi.fn();
    const onViewModeChange = vi.fn();
    const onExportCsv = vi.fn();
    const onOpenSafetyDialog = vi.fn();
    const onScenarioChange = vi.fn();

    render(
      <CashFlowHeader
        horizon={30}
        onHorizonChange={onHorizonChange}
        viewMode="chart"
        onViewModeChange={onViewModeChange}
        safetyThresholdPaise={500_000}
        onOpenSafetyDialog={onOpenSafetyDialog}
        selectedScenarioId={undefined}
        onScenarioChange={onScenarioChange}
        scenarios={scenarios}
        onExportCsv={onExportCsv}
      />,
    );

    expect(screen.getByText("Cash Flow")).toBeInTheDocument();
    expect(
      screen.getByText("Understand your future cash position before commitments become problems."),
    ).toBeInTheDocument();
    expect(screen.getByText("Export CSV")).toBeInTheDocument();
    expect(screen.getByText("Daily Ledger")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();

    // Clicking 14D triggers horizon change
    fireEvent.click(screen.getByText("14D"));
    expect(onHorizonChange).toHaveBeenCalledWith(14);

    // Clicking Daily Ledger triggers view mode change
    fireEvent.click(screen.getByText("Daily Ledger"));
    expect(onViewModeChange).toHaveBeenCalledWith("ledger");

    // Clicking Export CSV triggers export
    fireEvent.click(screen.getByText("Export CSV"));
    expect(onExportCsv).toHaveBeenCalled();
  });

  it("renders CashFlowLedgerView with table columns and handles expanding rows", async () => {
    const forecast = await forecastApi.getForecast(14);
    render(
      <CashFlowLedgerView
        ledger={forecast.dailyLedger}
        safetyThresholdPaise={forecast.safetyThresholdPaise}
      />,
    );

    expect(screen.getByText("Expected Inflows")).toBeInTheDocument();
    expect(screen.getByText("Supplier Payments")).toBeInTheDocument();
    expect(screen.getByText("Operating Exp.")).toBeInTheDocument();
    expect(screen.getByText("Closing Cash")).toBeInTheDocument();

    // Expand all button
    const expandBtn = screen.getByText("Expand all");
    fireEvent.click(expandBtn);
    expect(screen.getByText("Collapse all")).toBeInTheDocument();
  });

  it("renders CashFlowTimelineView and allows event direction filtering", async () => {
    const forecast = await forecastApi.getForecast(30);
    render(
      <CashFlowTimelineView
        events={forecast.events}
        safetyThresholdPaise={forecast.safetyThresholdPaise}
      />,
    );

    expect(screen.getByText(/All Events/)).toBeInTheDocument();
    expect(screen.getByText("Incoming Only")).toBeInTheDocument();
    expect(screen.getByText("Outgoing Only")).toBeInTheDocument();

    // Clicking Incoming Only filters view
    fireEvent.click(screen.getByText("Incoming Only"));
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });

  it("renders CashFlowScenarioBanner with comparison stats and assumptions", async () => {
    const forecast = await forecastApi.getForecast({
      days: 30,
      scenarioId: "sim_shree_delay",
    });
    expect(forecast.scenario).toBeDefined();

    const onClearScenario = vi.fn();
    render(
      <CashFlowScenarioBanner scenario={forecast.scenario!} onClearScenario={onClearScenario} />,
    );

    expect(screen.getByText("Scenario Comparison Active")).toBeInTheDocument();
    expect(screen.getByText("Baseline Min Cash")).toBeInTheDocument();
    expect(screen.getByText("Scenario Min Cash")).toBeInTheDocument();
    expect(screen.getByText("Liquidity Difference")).toBeInTheDocument();
    expect(screen.getByText("Assumptions:")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Reset Baseline"));
    expect(onClearScenario).toHaveBeenCalled();
  });

  it("handles CashFlowSafetyDialog inputs and submit", async () => {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <CashFlowSafetyDialog
        open={true}
        onOpenChange={onOpenChange}
        currentThresholdPaise={500_000}
        onSave={onSave}
      />,
    );

    expect(screen.getByText("Cash Safety Threshold")).toBeInTheDocument();
    expect(screen.getByText("₹10,000")).toBeInTheDocument();

    // Clicking preset ₹10,000 updates the value
    await act(async () => {
      fireEvent.click(screen.getByText("₹10,000"));
    });

    // Submit form
    await act(async () => {
      fireEvent.click(screen.getByText("Save Threshold"));
    });
    expect(onSave).toHaveBeenCalledWith(1_000_000);
  });
});
