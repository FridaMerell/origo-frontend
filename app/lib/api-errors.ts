export type FieldErrors<T> = Partial<Record<keyof T, string>>

/**
 * DRF returns `{ "email": ["…"], … }` for validation errors and `{ "detail": "…" }` otherwise.
 * Pulls the first message per known field; falls back to `detail`. Never surfaces a non-JSON
 * body (e.g. an HTML error page) to the user.
 */
export function readErrorBody<T>(
  detail: string,
  fields: readonly (keyof T)[],
): { message?: string; fieldErrors?: FieldErrors<T> } {
  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>
    const fieldErrors: FieldErrors<T> = {}
    for (const field of fields) {
      const raw = parsed[field as string]
      const text = Array.isArray(raw) ? raw[0] : typeof raw === "string" ? raw : undefined
      if (typeof text === "string") fieldErrors[field] = text
    }
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
    if (typeof parsed.detail === "string") return { message: parsed.detail }
  } catch {
    // Not JSON (e.g. an HTML error page) — never surface the raw body.
  }
  return {}
}

const GENERAL_ERROR_KEYS = new Set(["detail", "non_field_errors"])

/** Walks a DRF error body and returns the first message with the path to its field, e.g. "checklist_items.0". */
function firstFieldError(value: unknown, path: string[] = []): { path: string[]; message: string } | null {
  if (typeof value === "string") return { path, message: value }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = firstFieldError(item, typeof item === "string" ? path : [...path, String(index)])
      if (found) return found
    }
    return null
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const found = firstFieldError(item, GENERAL_ERROR_KEYS.has(key) ? path : [...path, key])
      if (found) return found
    }
  }
  return null
}

type ErrorMessageOptions = {
  /** Prefix the message with the field path, e.g. "checklist_items.0: …". */
  fieldPath?: boolean
  /** Message when the body holds no usable error; defaults to "Ett fel uppstod (status)." */
  fallback?: string
}

/**
 * DRF error body → a single message: the first error found, also inside nested fields. Never
 * surfaces a non-JSON body (e.g. an HTML error page) to the user.
 */
export function firstErrorMessage(detail: string, status: number, options: ErrorMessageOptions = {}): string {
  const fallback = options.fallback ?? `Ett fel uppstod (${status}).`
  try {
    const found = firstFieldError(JSON.parse(detail))
    if (found) return options.fieldPath && found.path.length > 0 ? `${found.path.join(".")}: ${found.message}` : found.message
  } catch {
    // Never expose a raw HTML or otherwise unstructured error response.
  }
  return fallback
}

/** Reads a failed API response and returns a readable error message. */
export async function responseErrorMessage(response: Response, options?: ErrorMessageOptions): Promise<string> {
  const detail = await response.text().catch(() => "")
  return firstErrorMessage(detail, response.status, options)
}
