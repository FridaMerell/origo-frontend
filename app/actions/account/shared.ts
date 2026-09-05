import type { FieldErrors } from "@/app/lib/api-errors"

export type AccountActionResult<T> =
  | { success?: boolean; error?: string; fieldErrors?: FieldErrors<T> }
  | undefined
