import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { delay } from "@/mocks/store";
import { buildForecast } from "@/mocks/data";
import type { ForecastPoint } from "@/types";

export const forecastApi = {
  async getForecast(days = 30): Promise<ForecastPoint[]> {
    if (DATA_MODE === "mock") {
      await delay();
      return buildForecast().slice(0, days);
    }
    return httpRequest<ForecastPoint[]>("/api/forecast", { query: { days } });
  },
};
