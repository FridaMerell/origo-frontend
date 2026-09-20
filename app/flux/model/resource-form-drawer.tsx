"use client"

import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { saveResource } from "@/app/actions/flux/design"
import { fluxResourceFormSchema, type FluxResourceFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { CheckboxGroup } from "@/app/components/form/CheckboxGroup"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxEntity, FluxField, FluxOperation, FluxResource } from "@/app/lib/dal"

export const OPERATION_LABELS: Record<FluxOperation, string> = {
  list: "Lista",
  retrieve: "Hämta",
  create: "Skapa",
  update: "Ändra",
  delete: "Ta bort",
}

const OPERATION_OPTIONS = (Object.keys(OPERATION_LABELS) as FluxOperation[]).map((value) => ({
  value,
  label: OPERATION_LABELS[value],
}))

const slug = (name: string) =>
  name.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()

const defaults = (entity: FluxEntity, resource?: FluxResource): FluxResourceFormValues => ({
  entity: entity.id,
  path: resource?.path ?? `${slug(entity.name)}s`,
  operations: resource?.operations ?? ["list", "retrieve", "create", "update", "delete"],
  filters: resource?.filters ?? [],
  ordering: resource?.ordering ?? "",
})

export function ResourceFormDrawer({
  open,
  onClose,
  entity,
  fields,
  resource,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  entity: FluxEntity
  fields: FluxField[]
  resource?: FluxResource
  onSaved: (resource: FluxResource) => void
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxResourceFormValues>({
    resolver: zodResolver(fluxResourceFormSchema),
    defaultValues: defaults(entity, resource),
  })

  useEffect(() => {
    if (!open) return
    reset(defaults(entity, resource))
  }, [open, entity, resource, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = await saveResource(resource?.id ?? null, data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Resursen kunde inte sparas." })
      return
    }
    onSaved(result.data)
    onClose()
  })

  return (
    <Drawer
      title={`${resource ? "Redigera" : "Ny"} resurs för ${entity.name}`}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <Field label="Sökväg" error={errors.path}>
          <input type="text" placeholder="t.ex. orders" className={fieldInputClass} {...register("path")} />
        </Field>

        <Controller
          control={control}
          name="operations"
          render={({ field }) => (
            <CheckboxGroup label="Operationer" options={OPERATION_OPTIONS} value={field.value} onChange={field.onChange} />
          )}
        />

        <Controller
          control={control}
          name="filters"
          render={({ field }) => (
            <CheckboxGroup
              label="Filtrerbara fält"
              options={fields.map((item) => ({ value: item.name, label: item.name }))}
              value={field.value}
              onChange={field.onChange}
              emptyText="Entiteten har inga fält än."
            />
          )}
        />

        <Field label="Sortering" error={errors.ordering}>
          <input type="text" placeholder="t.ex. -created_at" className={fieldInputClass} {...register("ordering")} />
        </Field>

        <FormRootError error={errors.root} />
        <FormActions
          isSubmitting={isSubmitting}
          submitLabel={resource ? "Spara" : "Skapa resurs"}
          onCancel={onClose}
          size="md"
          className="flex items-center justify-end gap-2.5 pt-2"
        />
      </form>
    </Drawer>
  )
}
