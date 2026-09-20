"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { saveIntegration } from "@/app/actions/flux/design"
import { fluxIntegrationFormSchema, type FluxIntegrationFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxIntegration, FluxIntegrationKind } from "@/app/lib/dal"

export const INTEGRATION_KIND_LABELS: Record<FluxIntegrationKind, string> = {
  api: "Externt API",
  auth: "Autentisering",
  storage: "Lagring",
  email: "E-post",
  payment: "Betalning",
  other: "Annat",
}

const defaults = (integration?: FluxIntegration): FluxIntegrationFormValues => ({
  name: integration?.name ?? "",
  kind: integration?.kind ?? "api",
  description: integration?.description ?? "",
  env_vars: integration?.env_vars.join("\n") ?? "",
})

export function IntegrationFormDrawer({
  open,
  onClose,
  projectId,
  integration,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  integration?: FluxIntegration
  onSaved: (integration: FluxIntegration) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxIntegrationFormValues>({
    resolver: zodResolver(fluxIntegrationFormSchema),
    defaultValues: defaults(integration),
  })

  useEffect(() => {
    if (!open) return
    reset(defaults(integration))
  }, [open, integration, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = await saveIntegration(projectId, integration?.id ?? null, data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Integrationen kunde inte sparas." })
      return
    }
    onSaved(result.data)
    onClose()
  })

  return (
    <Drawer
      title={integration ? "Redigera integration" : "Ny integration"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <div className="grid gap-4.5 sm:grid-cols-2">
          <Field label="Namn" error={errors.name}>
            <input type="text" placeholder="t.ex. Stripe" className={fieldInputClass} {...register("name")} />
          </Field>
          <Field label="Typ" error={errors.kind}>
            <select className={fieldInputClass} {...register("kind")}>
              {Object.entries(INTEGRATION_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={2} className={fieldInputClass} {...register("description")} />
        </Field>

        <Field label="Miljövariabler (en per rad)" error={errors.env_vars}>
          <textarea rows={4} placeholder={"STRIPE_SECRET_KEY\nSTRIPE_WEBHOOK_SECRET"} className={`${fieldInputClass} font-mono text-xs`} {...register("env_vars")} />
        </Field>

        <FormRootError error={errors.root} />
        <FormActions
          isSubmitting={isSubmitting}
          submitLabel={integration ? "Spara" : "Skapa integration"}
          onCancel={onClose}
          size="md"
          className="flex items-center justify-end gap-2.5 pt-2"
        />
      </form>
    </Drawer>
  )
}
