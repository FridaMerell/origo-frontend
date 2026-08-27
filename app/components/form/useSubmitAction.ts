"use client";

import type { FieldValues, UseFormSetError } from "react-hook-form";

type ActionResult = { error?: string } | undefined;

/**
 * Standard "submit to a server action" flow shared by every form. The hook
 * only translates an action error to a root form error. What success means
 * (close a drawer, reset an inline form, redirect, etc.) stays explicit in
 * the form that owns that behavior.
 */
export function useSubmitAction<T extends FieldValues>(setError: UseFormSetError<T>) {
  return async function submit(run: () => Promise<ActionResult>, onSuccess?: () => void) {
    const result = await run();
    if (result?.error) {
      setError("root" as never, { message: result.error });
      return false;
    }
    onSuccess?.();
    return true;
  };
}
