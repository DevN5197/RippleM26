import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settingsApi";
import { forecastApi } from "@/lib/api/forecastApi";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { db, resetDbToSeed } from "@/mocks/store";
import { BusinessProfileSection } from "@/components/settings/business-profile-section";
import { FinancialPreferencesSection } from "@/components/settings/financial-preferences-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { DataPrivacySection } from "@/components/settings/data-privacy-section";
import { AppSettingsSection } from "@/components/settings/app-settings-section";

// Polyfill ResizeObserver for Radix UI Switch in jsdom
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("Settings Module & API", () => {
  beforeEach(() => {
    resetDbToSeed();
  });

  it("1. fetches initial settings accurately in mock mode", async () => {
    const settings = await settingsApi.getSettings();

    expect(settings.business.name).toBe("Rupi Clothing");
    expect(settings.business.currency).toBe("INR");
    expect(settings.business.openingCashPaise).toBe(1_000_000);
    expect(settings.business.safetyThresholdPaise).toBe(500_000);
    expect(settings.notifications.lowCash).toBe(true);
    expect(settings.notifications.highRippleImpact).toBe(true);
    expect(settings.app.theme).toBe("system");
    expect(settings.dataMode).toBe("mock");
  });

  it("2. updates business profile and persists changes in mock store", async () => {
    const updated = await settingsApi.updateSettings({
      business: {
        name: "Rupi Apparel Co",
        ownerName: "Priya Sharma",
        phone: "+91 99999 88888",
        industry: "Textile manufacturing",
      },
    });

    expect(updated.business.name).toBe("Rupi Apparel Co");
    expect(updated.business.ownerName).toBe("Priya Sharma");
    expect(db.business.name).toBe("Rupi Apparel Co");
    expect(db.business.ownerName).toBe("Priya Sharma");
  });

  it("3. updating low-cash threshold and forecast horizon updates forecasts and alerts", async () => {
    // Change safety threshold to ₹8,000 (800,000 paise) and default horizon to 14 days
    await settingsApi.updateSettings({
      business: {
        safetyThresholdPaise: 800_000,
        defaultForecastHorizonDays: 14,
      },
    });

    expect(db.business.safetyThresholdPaise).toBe(800_000);
    expect(db.business.defaultForecastHorizonDays).toBe(14);

    // Call forecastApi without explicit parameters
    const forecast = await forecastApi.getForecast();
    expect(forecast.safetyThresholdPaise).toBe(800_000);
    expect(forecast.periodDays).toBe(14);
    expect(forecast.points.length).toBe(14);
  });

  it("4. updating notification preferences filters relevant dashboard alerts", async () => {
    const initialSummary = await dashboardApi.getSummary();
    const hasLowCashInitial = initialSummary.alerts.some(
      (a) => a.id === "risk_1" || a.title.toLowerCase().includes("cash shortfall"),
    );
    expect(hasLowCashInitial).toBe(true);

    // Disable low cash notifications
    await settingsApi.updateSettings({
      notifications: {
        lowCash: false,
      },
    });

    const updatedSummary = await dashboardApi.getSummary();
    const hasLowCashAfter = updatedSummary.alerts.some(
      (a) => a.id === "risk_1" || a.title.toLowerCase().includes("cash shortfall"),
    );
    expect(hasLowCashAfter).toBe(false);
  });

  it("5. resets demo data back to pristine seed", async () => {
    await settingsApi.updateSettings({
      business: {
        name: "Temporary Business Modification",
        openingCashPaise: 9_999_900,
      },
      notifications: {
        lowCash: false,
      },
    });

    expect(db.business.name).toBe("Temporary Business Modification");

    const resetRes = await settingsApi.resetDemoData();
    expect(resetRes.success).toBe(true);

    expect(db.business.name).toBe("Rupi Clothing");
    expect(db.business.openingCashPaise).toBe(1_000_000);
    expect(db.notifications.lowCash).toBe(true);
  });
});

describe("Settings UI Components", () => {
  beforeEach(() => {
    resetDbToSeed();
  });

  it("renders BusinessProfileSection and handles save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <BusinessProfileSection
        business={db.business}
        onSave={onSave}
        isSaving={false}
      />
    );

    expect(screen.getByDisplayValue("Rupi Clothing")).toBeInTheDocument();
    expect(screen.getByLabelText(/Business Name/i)).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue("Rupi Clothing");
    fireEvent.change(nameInput, { target: { value: "Rupi Global" } });

    const saveBtn = screen.getByRole("button", { name: /Save Profile/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Rupi Global",
        })
      );
    });
  });

  it("renders FinancialPreferencesSection and validates numerical inputs", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <FinancialPreferencesSection
        business={db.business}
        onSave={onSave}
        isSaving={false}
      />
    );

    expect(screen.getByLabelText(/Opening Cash Balance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Low-Cash Alert Threshold/i)).toBeInTheDocument();

    const thresholdInput = screen.getByLabelText(/Low-Cash Alert Threshold/i);
    fireEvent.change(thresholdInput, { target: { value: "7500" } });

    const saveBtn = screen.getByRole("button", { name: /Save Preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          safetyThresholdPaise: 750_000,
        })
      );
    });
  });

  it("renders NotificationsSection and toggles preferences", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <NotificationsSection
        notifications={db.notifications}
        onSave={onSave}
        isSaving={false}
      />
    );

    expect(screen.getByText("Overdue Payments")).toBeInTheDocument();
    expect(screen.getByText("Low Cash & Shortfalls")).toBeInTheDocument();
    expect(screen.getByText("High Ripple Impact Score")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /Save Notifications/i });
    expect(saveBtn).toBeDisabled(); // No changes initially
  });

  it("renders DataPrivacySection with export and reset controls", () => {
    const onReset = vi.fn();

    render(
      <DataPrivacySection
        dataMode="mock"
        onResetDemoData={onReset}
        isResetting={false}
      />
    );

    expect(screen.getByText("Current Operating Mode")).toBeInTheDocument();
    expect(screen.getByText("Export to CSV")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reset Demo Data/i })
    ).toBeInTheDocument();
  });

  it("renders AppSettingsSection with theme options and compact mode toggle", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AppSettingsSection
        appPreferences={db.app}
        onSave={onSave}
        isSaving={false}
      />
    );

    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("Compact Table Mode")).toBeInTheDocument();
    expect(screen.getByText(/Ripple v1.0.0/)).toBeInTheDocument();
  });
});
