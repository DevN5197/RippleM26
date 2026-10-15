/**
 * Runtime configuration.
 *
 * VITE_DATA_MODE: "mock" (default, fully local demo data) or "api" (live backend).
 * VITE_API_BASE_URL: base URL of the FastAPI backend, e.g. https://api.example.com
 */

function resolveDataMode(): "mock" | "api" {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("ripple_data_mode");
      if (stored === "mock" || stored === "api") {
        return stored;
      }
    } catch {
      // Storage might be unavailable
    }
  }
  return import.meta.env["VITE_DATA_MODE"] === "api" ? "api" : "mock";
}

export const DATA_MODE: "mock" | "api" = resolveDataMode();

export function setDataMode(mode: "mock" | "api"): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("ripple_data_mode", mode);
    } catch {
      // ignore
    }
    window.location.reload();
  }
}

export const API_BASE_URL: string = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";

export const IS_DEMO = DATA_MODE === "mock";
