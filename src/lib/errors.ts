/**
 * Narrowing helpers for `catch` blocks.
 *
 * `catch (err)` gives `unknown`. Casting it to `any` (which the lint rules forbid)
 * silently accepts typos and wrong shapes. These helpers turn an unknown thrown
 * value into the small shape the API client actually guarantees (`ApiError`:
 * `status`, `code`, `message`), so error handling stays type-safe.
 */

export interface NormalizedApiError {
  code: string | undefined;
  status: number | undefined;
  message: string | undefined;
}

function pick(value: unknown, key: string): unknown {
  return value !== null && typeof value === "object" && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

export function toApiError(err: unknown): NormalizedApiError {
  const code = pick(err, "code");
  const status = pick(err, "status");
  const message = pick(err, "message");

  return {
    code: typeof code === "string" ? code : undefined,
    status: typeof status === "number" ? status : undefined,
    message: typeof message === "string" ? message : undefined,
  };
}

/**
 * True when the failure means "the backend could not be reached" — the offline
 * demo fallback keys off this, so it must stay in one place.
 */
export function isNetworkError(err: unknown): boolean {
  const { code, status } = toApiError(err);
  return code === "network_error" || status === 0;
}
