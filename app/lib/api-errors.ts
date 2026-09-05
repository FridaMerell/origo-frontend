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

/**
 * DRF error body → a single message, picking the first field's first error. Never surfaces a
 * non-JSON body (e.g. an HTML error page) to the user.
 */
export function firstErrorMessage(detail: string, status: number): string {
  const fallback = `Ett fel uppstod (${status}).`
  try {
    const parsed = JSON.parse(detail)
    const firstKey = Object.keys(parsed)[0]
    const firstValue = firstKey ? parsed[firstKey] : undefined
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") return firstValue[0]
    if (typeof firstValue === "string") return firstValue
    if (typeof parsed?.detail === "string") return parsed.detail
  } catch {
    // Never expose a raw HTML or otherwise unstructured error response.
  }
  return fallback
}
