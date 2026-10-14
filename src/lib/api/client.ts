import { API_BASE_URL } from "@/lib/config";
import type { ApiErrorBody } from "@/types";

/**
 * Centralized HTTP client for the FastAPI backend.
 * Used only when VITE_DATA_MODE=api. Mock mode never touches the network.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined>;
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, query } = options;

  const baseUrl =
    API_BASE_URL ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "http://localhost:3000");
  const url = new URL(
    path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      ...(signal ? { signal } : {}),
      ...(body !== undefined
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "network_error", "Could not reach the server. Check your connection.");
  }

  if (!response.ok) {
    let errorBody: ApiErrorBody | undefined;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body — fall through to generic error
    }
    throw new ApiError(
      response.status,
      errorBody?.error.code ?? "http_error",
      errorBody?.error.message ?? `Request failed with status ${response.status}`,
      errorBody?.error.fieldErrors,
    );
  }

  // Handle empty responses (204 No Content, empty body) safely.
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
