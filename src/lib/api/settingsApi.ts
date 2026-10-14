import { DATA_MODE } from "@/lib/config";
import { httpRequest } from "@/lib/api/client";
import { db, delay, resetDbToSeed } from "@/mocks/store";
import type { AppSettings, UpdateSettingsInput } from "@/types";

/**
 * Settings API service.
 * Adapts to GET /settings, PATCH /settings, and POST /settings/reset-demo-data.
 */
export const settingsApi = {
  async getSettings(): Promise<AppSettings> {
    if (DATA_MODE === "mock") {
      await delay(150);
      return {
        business: { ...db.business },
        notifications: { ...db.notifications },
        app: { ...db.app },
        dataMode: DATA_MODE,
      };
    }

    return httpRequest<AppSettings>("/settings");
  },

  async updateSettings(input: UpdateSettingsInput): Promise<AppSettings> {
    if (DATA_MODE === "mock") {
      await delay(200);

      if (input.business) {
        db.business = {
          ...db.business,
          ...input.business,
        };
      }

      if (input.notifications) {
        db.notifications = {
          ...db.notifications,
          ...input.notifications,
        };
      }

      if (input.app) {
        db.app = {
          ...db.app,
          ...input.app,
        };
      }

      return {
        business: { ...db.business },
        notifications: { ...db.notifications },
        app: { ...db.app },
        dataMode: DATA_MODE,
      };
    }

    return httpRequest<AppSettings>("/settings", {
      method: "PATCH",
      body: input,
    });
  },

  async resetDemoData(): Promise<{ success: boolean; message: string }> {
    if (DATA_MODE === "mock") {
      await delay(300);
      resetDbToSeed();
      return { success: true, message: "Demo data has been reset to its initial state." };
    }

    // In API mode, check safety / invoke the reset-demo-data endpoint if available
    return httpRequest<{ success: boolean; message: string }>("/settings/reset-demo-data", {
      method: "POST",
    });
  },
};
