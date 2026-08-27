# Model → form pattern

How every form in this app (Verso and Flux) is wired up. Follow this recipe for
new models instead of inventing a new shape.

## 1. Add a zod schema in `app/lib/schemas.ts`

One schema per form, plus its inferred type. This is the single source of
truth for both client-side validation and the TS type the form/action share.

```ts
export const widgetFormSchema = z.object({
  name: z.string().min(1, "Namn krävs."),
  quantity: z.coerce.number().int().min(0),
})
export type WidgetFormValues = z.infer<typeof widgetFormSchema>
```

**Watch out for IDs.** Anything that references another record by id (a
`venture`, `project`, `milestone`, etc.) may come back from the API as a
`number` even where the TS model type says `string`, or vice versa. Coerce
defensively instead of trusting the declared type — see `idRef` and
`numericId`/`optionalNumericId` at the bottom of `schemas.ts` for the pattern.
An `optionalNumericId`-style field (an id that can be cleared to "none" via an
empty `<select>`) must special-case `""` to `null` *before* coercing to a
number, or `Number("")` silently becomes `0`. `schemas.test.ts` has a test for
exactly this — copy that test for any new nullable id field.

## 2. Write a server action in `app/actions/*.ts`

```ts
"use server"

export type CreateWidgetState = { error?: string; success?: boolean } | undefined

export async function createWidget(
  data: WidgetFormValues,
  path?: string
): Promise<CreateWidgetState> {
  const parsed = widgetFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Alla fält måste fyllas i." }

  const response = await fetchOrigoApi(ENDPOINTS.widgets, {
    method: "POST",
    headers: { /* ... see an existing action for the CSRF/session boilerplate */ },
    body: JSON.stringify(parsed.data),
  })

  if (!response.ok) return { error: "Kunde inte skapa. Försök igen." }

  revalidatePath(path || "/somewhere")
  return { success: true }
}
```

Every action in the app returns exactly `{ error?: string; success?: boolean } | undefined`
— there is only this one shape. If you're tempted to invent a richer error
type (per-field errors, error codes, ...), don't: put the specific message in
`error` and let the schema's `.min(1, "...")` messages carry per-field detail
on the client side instead.

Call the action directly from the client with typed data — Next Server
Actions don't require `FormData`/`<form action>`, a plain async function call
works and is what every form here does.

## 3. Write the form component

```tsx
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { widgetFormSchema, type WidgetFormValues } from "@/app/lib/schemas"
import { createWidget } from "@/app/actions/widget"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"

export function WidgetForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WidgetFormValues>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: { name: "", quantity: 0 },
  })
  const submit = useSubmitAction(setError)
  const onSubmit = handleSubmit((data) => submit(() => createWidget(data)))

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Namn" error={errors.name}>
        <input className={fieldInputClass} {...register("name")} />
      </Field>
      <Field label="Antal" error={errors.quantity}>
        <input className={fieldInputClass} {...register("quantity")} />
      </Field>
      {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}
      <button type="submit" disabled={isSubmitting}>Spara</button>
    </form>
  )
}
```

`useSubmitAction` calls the action and puts a returned `error` on
`errors.root` for you to render. Success behavior is deliberately explicit:
pass the owning form's callback as the second argument. A Drawer form passes
`onClose` (or `useDrawerClose()`), while an inline form can reset its values.
Server actions that call `revalidatePath` already return the refreshed server
tree in the same roundtrip, so the hook does not add a second `router.refresh()`.

For example: `submit(() => createWidget(data), () => reset())`.

## Files uploaded to Vercel Blob

`FileUpload` uploads directly through the Next route to Vercel Blob. These
files are not ordinary Django form fields. Use `useUploadedFiles` to own the
uploaded file references, then pass `uploadedFiles.urls` to the server action
when the Django model is saved. Supply the model id as `resetKey` in edit
forms so switching records cannot retain stale files.

## Reference implementations

- Simple form: `app/verso/planera/venture-form.tsx` + `app/actions/venture.ts`
- Form with an id-link picker: `app/verso/update-form.tsx`
- Form inside a controlled Drawer with a multi-select: `app/flux/tasks/task-form-drawer.tsx`

## Tests

Schema behavior is covered in `app/lib/schemas.test.ts` (`npm test`). Add
cases there for any new schema, especially id-coercion edge cases — that's
where the real bugs have come from historically, not from the form UI itself.

`npm run test:forms` runs the complete form contract inventory plus tests for
shared submit and Vercel Blob state. Add one representative browser-shaped
payload to `form-contracts.ts` whenever a new schema-backed form is created.
