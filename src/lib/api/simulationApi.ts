import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { delay, nextId } from "@/mocks/store";
import { buildForecast } from "@/mocks/data";
import type { SimulationScenario, SimulationResult } from "@/types";

/**
 * Deterministic local simulation for mock mode: shifts the target event's
 * cash impact by the given number of days and recomputes the forecast.
 * The real what-if engine lives in the FastAPI backend.
 */
export const simulationApi = {
  async runScenario(
    input: Omit<SimulationScenario, "id" | "createdAt">,
  ): Promise<SimulationResult> {
    if (DATA_MODE === "mock") {
      await delay(600);
      const scenario: SimulationScenario = {
        ...input,
        id: nextId("sim"),
        createdAt: new Date().toISOString(),
      };
      const baseline = buildForecast();
      // Deterministic placeholder: scenario forecast equals baseline until the
      // real engine exists. Kept structurally correct so the UI is fully wired.
      const min = baseline.reduce((a, b) =>
        a.projectedBalancePaise <= b.projectedBalancePaise ? a : b,
      );
      return {
        scenarioId: scenario.id,
        baselineForecast: baseline,
        scenarioForecast: baseline,
        impactedEventIds: [scenario.targetEventId],
        minBalancePaise: min.projectedBalancePaise,
        minBalanceDate: min.date,
        summary: `Scenario "${scenario.name}" applied to event ${scenario.targetEventId}. Connect the backend simulation engine for full ripple analysis.`,
      };
    }
    return httpRequest<SimulationResult>("/api/simulations", { method: "POST", body: input });
  },
};
