"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { saveStackProfile } from "@/app/actions/flux/design"
import { fluxStackFormSchema, type FluxStackFormValues } from "@/app/lib/schemas"
import { CheckboxGroup } from "@/app/components/form/CheckboxGroup"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxStackProfile } from "@/app/lib/dal"
import { useModel } from "./model-context"

const TARGET_OPTIONS = [
  { value: "django" as const, label: "Django" },
  { value: "typescript" as const, label: "TypeScript" },
  { value: "csharp" as const, label: "C#" },
]

const values = (profile: FluxStackProfile | null): FluxStackFormValues => ({
  targets: profile?.targets ?? ["django", "typescript"],
  api_naming: profile?.api_naming ?? "snake_case",
  auth_method: profile?.auth_method ?? "session",
  database: profile?.database ?? "postgresql",
  app_label: profile?.app_label ?? "",
  namespace: profile?.namespace ?? "",
})

export function StackView({ initialProfile }: { initialProfile: FluxStackProfile | null }) {
  const { projectId } = useModel()
  const [profile, setProfile] = useState(initialProfile)
  const [saved, setSaved] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FluxStackFormValues>({
    resolver: zodResolver(fluxStackFormSchema),
    defaultValues: values(initialProfile),
  })

  const onSubmit = handleSubmit(async (data) => {
    setSaved(false)
    const result = await saveStackProfile(projectId, profile?.id ?? null, data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Stack-profilen kunde inte sparas." })
      return
    }
    setProfile(result.data)
    reset(values(result.data))
    setSaved(true)
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4.5 rounded-lg border border-border bg-surface p-5">
      <p className="text-sm text-text-muted">
        Stack-profilen styr vad kodgeneratorerna skapar för projektet.
      </p>

      <Controller
        control={control}
        name="targets"
        render={({ field }) => (
          <CheckboxGroup label="Mål" options={TARGET_OPTIONS} value={field.value} onChange={field.onChange} />
        )}
      />

      <div className="grid gap-4.5 sm:grid-cols-3">
        <Field label="API-namngivning" error={errors.api_naming}>
          <select className={fieldInputClass} {...register("api_naming")}>
            <option value="snake_case">snake_case</option>
            <option value="camel_case">camelCase</option>
          </select>
        </Field>
        <Field label="Autentisering" error={errors.auth_method}>
          <select className={fieldInputClass} {...register("auth_method")}>
            <option value="session">Session</option>
            <option value="token">Token</option>
            <option value="jwt">JWT</option>
            <option value="none">Ingen</option>
          </select>
        </Field>
        <Field label="Databas" error={errors.database}>
          <select className={fieldInputClass} {...register("database")}>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sqlite">SQLite</option>
            <option value="sqlserver">SQL Server</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-4.5 sm:grid-cols-2">
        <Field label="Django app-label" error={errors.app_label}>
          <input type="text" placeholder="t.ex. shop" className={fieldInputClass} {...register("app_label")} />
        </Field>
        <Field label="C# namespace" error={errors.namespace}>
          <input type="text" placeholder="t.ex. Acme.Shop" className={fieldInputClass} {...register("namespace")} />
        </Field>
      </div>

      <FormRootError error={errors.root} />
      {saved && <p role="status" className="text-sm text-text-muted">Sparat.</p>}
      <FormActions
        isSubmitting={isSubmitting}
        submitLabel="Spara"
        size="md"
        className="flex items-center justify-end gap-2.5 pt-2"
      />
    </form>
  )
}
