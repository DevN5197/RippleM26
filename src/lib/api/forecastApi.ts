import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay } from "@/mocks/store";
import { buildDetailedForecast } from "@/mocks/data";
import type { ForecastResponse, GetForecastParams, SimulationScenario } from "@/types";

export const forecastApi = {
  async getForecast(paramsOrDays: number | GetForecastParams = 30): Promise<ForecastResponse> {
    const params: GetForecastParams =
      typeof paramsOrDays === "number" ? { days: paramsOrDays } : (paramsOrDays ?? {});
    const days = params.days ?? 30;
    const scenarioId = params.scenarioId;
    const safetyThresholdPaise =
      params.safetyThresholdPaise ?? db.business.safetyThresholdPaise ?? 500_000;
    const businessId = params.businessId ?? db.business.id;

    if (DATA_MODE === "mock") {
      await delay();
      return buildDetailedForecast(
        db.cashFlowEvents,
        db.business.openingCashPaise,
        days,
        safetyThresholdPaise,
        scenarioId,
      );
    }

    return httpRequest<ForecastResponse>("/api/forecast", {
      query: {
        business_id: businessId,
        days,
        scenario_id: scenarioId,
        safety_threshold: safetyThresholdPaise,
      },
    });
  },

  async updateSafetyThreshold(
    safetyThresholdPaise: number,
  ): Promise<{ success: boolean; safetyThresholdPaise: number }> {
    if (DATA_MODE === "mock") {
      await delay(200);
      db.business.safetyThresholdPaise = safetyThresholdPaise;
      return { success: true, safetyThresholdPaise };
    }

    return httpRequest<{ success: boolean; safetyThresholdPaise: number }>(
      "/api/business/safety-threshold",
      {
        method: "PATCH",
        body: { safetyThresholdPaise },
      },
    );
  },

  async getScenarios(): Promise<SimulationScenario[]> {
    if (DATA_MODE === "mock") {
      await delay(150);
      return db.simulationScenarios;
    }

    return httpRequest<SimulationScenario[]>("/api/simulations/scenarios");
  },
};
