import type { FieldValues, Resolver } from "react-hook-form"
import type { ZodType } from "zod"

/**
 * Zod 4 compatible resolver for react-hook-form.
 *
 * The installed @hookform/resolvers version expects Zod 3's `errors` field.
 * Reading Zod 4's `issues` directly lets invalid forms recover by displaying
 * their validation messages instead of throwing during submission.
 */
export function zodResolver<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  return async (values) => {
    const result = await schema.safeParseAsync(values)

    if (result.success) return { values: result.data, errors: {} }

    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "root"
      if (!errors[path]) errors[path] = { type: String(issue.code), message: issue.message }
    }

    return { values: {}, errors: errors as never }
  }
}
