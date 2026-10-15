import { API_BASE_URL } from "@/lib/config";
import type { ApiErrorBody } from "@/types";

/**
 * Centralized HTTP client for the FastAPI backend.
 * Used only when VITE_DATA_MODE=api. Mock mode never touches the network.
 */

const AUTH_TOKEN_KEY = "ripple_auth_token";
const ACTIVE_BIZ_KEY = "ripple_active_biz_id";

function safeStorage(): Storage | null {
  try {
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      typeof window.localStorage.getItem === "function"
    ) {
      return window.localStorage;
    }
  } catch {
    // localStorage might be blocked or unavailable
  }
  return null;
}

const ACCESS_TOKEN_KEY = "access_token";

export function getAuthToken(): string | null {
  const storage = safeStorage();
  if (!storage) return null;
  return storage.getItem(ACCESS_TOKEN_KEY) || storage.getItem(AUTH_TOKEN_KEY) || null;
}

export function setAuthToken(token: string | null): void {
  const storage = safeStorage();
  if (token) {
    if (storage) {
      storage.setItem(ACCESS_TOKEN_KEY, token);
      storage.setItem(AUTH_TOKEN_KEY, token);
    }
    if (typeof document !== "undefined") {
      document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Lax`;
    }
  } else {
    if (storage) {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(AUTH_TOKEN_KEY);
    }
    if (typeof document !== "undefined") {
      document.cookie = `access_token=; path=/; max-age=0`;
    }
  }
}

export function getActiveBusinessId(): string | null {
  const storage = safeStorage();
  return storage ? storage.getItem(ACTIVE_BIZ_KEY) : null;
}

export function setActiveBusinessId(id: string | null): void {
  const storage = safeStorage();
  if (!storage) return;
  if (id) {
    storage.setItem(ACTIVE_BIZ_KEY, id);
  } else {
    storage.removeItem(ACTIVE_BIZ_KEY);
  }
}

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
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | undefined;
  body?: unknown;
  signal?: AbortSignal | undefined;
  query?: Record<string, string | number | undefined> | undefined;
  headers?: Record<string, string> | undefined;
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, query, headers: extraHeaders = {} } = options;

  const baseUrl =
    API_BASE_URL ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "http://127.0.0.1:8000");

  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  const url = new URL(path.startsWith("http") ? path : `${cleanBase}/${cleanPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const token = getAuthToken();
  const activeBizId = getActiveBusinessId();

  const reqHeaders: Record<string, string> = {
    ...extraHeaders,
  };

  if (body !== undefined) {
    reqHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (activeBizId) {
    reqHeaders["x-business-id"] = activeBizId;
  }

  let response!: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: reqHeaders,
      ...(signal ? { signal } : {}),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;

    // On Windows, 'localhost' resolves to IPv6 '::1' first, which may timeout if the backend
    // binds only to IPv4 (0.0.0.0 / 127.0.0.1). Retry once directly using 127.0.0.1.
    let retried = false;
    if (url.hostname === "localhost") {
      try {
        const retryUrl = new URL(url.toString());
        retryUrl.hostname = "127.0.0.1";
        response = await fetch(retryUrl.toString(), {
          method,
          headers: reqHeaders,
          ...(signal ? { signal } : {}),
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        retried = true;
      } catch {
        // Fall through to error reporting
      }
    }

    if (!retried) {
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      const targetIsHttp = url.protocol === "http:";
      if (isHttps && targetIsHttp) {
        throw new ApiError(
          0,
          "network_error",
          `Mixed Content blocked: Insecure HTTP backend (${url.origin}) cannot be called from an HTTPS page. Switch to Demo Mode or use an HTTPS backend proxy.`,
        );
      }
      throw new ApiError(
        0,
        "network_error",
        `Could not reach the server at ${url.origin}. Please ensure the backend is running.`,
      );
    }
  }

  if (!response.ok) {
    let errorBody: ApiErrorBody | undefined;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body
    }

    // Handle 401 Unauthorized or 403 Forbidden: automatically clear expired tokens & redirect to /login
    if ((response.status === 401 || response.status === 403) && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (!currentPath.includes("/login") && !currentPath.includes("/register")) {
        setAuthToken(null);
        try {
          window.localStorage?.removeItem("access_token");
          window.localStorage?.removeItem("ripple_auth_user");
          window.localStorage?.removeItem("ripple_auth_biz");
          window.localStorage?.removeItem("ripple_auth_token");
        } catch {
          // ignore storage errors
        }
        window.location.href = "/login";
      }
    }

    const detailMsg = errorBody?.detail || errorBody?.error?.message;
    throw new ApiError(
      response.status,
      errorBody?.error?.code ?? (response.status === 401 ? "unauthorized" : "http_error"),
      detailMsg ?? `Request failed with status ${response.status}`,
      errorBody?.error?.fieldErrors,
    );
  }

  // Handle empty responses (204 No Content, empty body) safely.
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
