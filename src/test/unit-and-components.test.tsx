import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatMoney, formatMoneyCompact, formatDate, toISODate } from "@/lib/formatters";
import { RiskIndicator } from "@/components/shared/risk-indicator";
import { StatusBadge } from "@/components/shared/status-badge";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { forecastApi } from "@/lib/api/forecastApi";
import type { RiskSeverity } from "@/types";

describe("Formatters", () => {
  it("formats money correctly as INR", () => {
    const formatted = formatMoney(100000); // ₹1,000
    expect(formatted).toContain("1,000");
  });

  it("formats compact money with correct signs and Indian denominations", () => {
    expect(formatMoneyCompact(10000000)).toBe("₹1.0L");
    expect(formatMoneyCompact(120000)).toBe("₹1.2k");
    expect(formatMoneyCompact(50000)).toBe("₹500");
    expect(formatMoneyCompact(0)).toBe("₹0");

    // Negative numbers should put the minus sign before the currency symbol
    expect(formatMoneyCompact(-10000000)).toBe("−₹1.0L");
    expect(formatMoneyCompact(-120000)).toBe("−₹1.2k");
    expect(formatMoneyCompact(-50000)).toBe("−₹500");
  });

  it("formats dates safely", () => {
    const iso = "2026-05-15";
    expect(formatDate(iso)).toBe("15 May 2026");
    expect(toISODate(new Date(2026, 4, 15))).toBe("2026-05-15");
  });
});

describe("RiskIndicator", () => {
  it("renders critical, warning, and info severities", () => {
    const { rerender } = render(<RiskIndicator severity="critical" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();

    rerender(<RiskIndicator severity="warning" />);
    expect(screen.getByText("Warning")).toBeInTheDocument();

    rerender(<RiskIndicator severity="info" />);
    expect(screen.getByText("Info")).toBeInTheDocument();
  });

  it("falls back gracefully without crashing when an unknown severity is provided", () => {
    render(<RiskIndicator severity={"unknown" as unknown as RiskSeverity} />);
    expect(screen.getByText("Info")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("renders known status labels with appropriate styling", () => {
    render(<StatusBadge status="partially_paid" />);
    expect(screen.getByText("Partially paid")).toBeInTheDocument();
  });

  it("formats unknown snake_case status strings cleanly", () => {
    render(<StatusBadge status="awaiting_clearance" />);
    expect(screen.getByText("Awaiting clearance")).toBeInTheDocument();
  });
});

describe("APIs in mock mode", () => {
  it("computes dashboard summary and forecast without throwing", async () => {
    const summary = await dashboardApi.getSummary();
    expect(summary).toBeDefined();
    expect(summary.forecast.length).toBeGreaterThan(0);
    expect(typeof summary.cashOnHandPaise).toBe("number");
    expect(Array.isArray(summary.alerts)).toBe(true);
  });

  it("retrieves forecast points with correct length", async () => {
    const forecast = await forecastApi.getForecast(14);
    expect(forecast.length).toBe(14);
  });
});
