/**
 * Runtime configuration.
 * Hard-locked to Live API mode ("api") connecting to the FastAPI backend.
 */

if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("ripple_data_mode");
  } catch {
    // Storage might be restricted
  }
}

// In test runner (Vitest), fallback to mock store so unit test suites execute without live backend.
// In browser runtime (dev & prod), hard-locked to live API mode ("api").
export const DATA_MODE: "api" | "mock" =
  typeof import.meta !== "undefined" && import.meta.env?.MODE === "test" ? "mock" : "api";

export function getDataMode(): "api" | "mock" {
  return typeof import.meta !== "undefined" && import.meta.env?.MODE === "test" ? "mock" : "api";
}

export function setDataMode(_mode: "api" | "mock"): void {
  // Hard-locked to live API mode in production; switches are prevented
}

export const API_BASE_URL: string = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000";

export const IS_DEMO = false;

