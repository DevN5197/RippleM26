/**
 * Runtime configuration.
 *
 * VITE_DATA_MODE: "mock" (default, fully local demo data) or "api" (live backend).
 * VITE_API_BASE_URL: base URL of the FastAPI backend, e.g. https://api.example.com
 */

export const DATA_MODE: "mock" | "api" =
  import.meta.env["VITE_DATA_MODE"] === "api" ? "api" : "mock";

export const API_BASE_URL: string = import.meta.env["VITE_API_BASE_URL"] ?? "";

export const IS_DEMO = DATA_MODE === "mock";
