"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createField, updateField } from "@/app/actions/flux/datamodel"
import { FLUX_FIELD_TYPES, fluxFieldFormSchema, type FluxFieldFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxField } from "@/app/lib/dal"

const emptyValues = (field?: FluxField): FluxFieldFormValues => ({
  name: field?.name ?? "",
  type: field?.type ?? "string",
  description: field?.description ?? "",
  nullable: field?.nullable ?? false,
  unique: field?.unique ?? false,
  default: field?.default ?? "",
  max_length: field?.max_length ?? null,
})

export function FieldFormDrawer({
  open,
  onClose,
  entityId,
  nextOrder,
  field,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  entityId: number
  nextOrder: number
  field?: FluxField
  onSaved: (field: FluxField) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxFieldFormValues>({
    resolver: zodResolver(fluxFieldFormSchema),
    defaultValues: emptyValues(field),
  })

  useEffect(() => {
    if (!open) return
    reset(emptyValues(field))
  }, [open, field, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = field ? await updateField(field.id, data) : await createField(entityId, nextOrder, data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Fältet kunde inte sparas." })
      return
    }
    onSaved(result.data)
    onClose()
  })

  return (
    <Drawer
      title={field ? "Redigera fält" : "Nytt fält"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <Field label="Namn" error={errors.name}>
          <input type="text" placeholder="t.ex. order_number" className={fieldInputClass} {...register("name")} />
        </Field>

        <Field label="Typ" error={errors.type}>
          <select className={fieldInputClass} {...register("type")}>
            {FLUX_FIELD_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </Field>

        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={2} className={fieldInputClass} {...register("description")} />
        </Field>

        <div className="grid gap-4.5 sm:grid-cols-2">
          <Field label="Standardvärde" error={errors.default}>
            <input type="text" className={fieldInputClass} {...register("default")} />
          </Field>
          <Field label="Maxlängd" error={errors.max_length}>
            <input type="number" min={1} className={fieldInputClass} {...register("max_length")} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-6 text-sm text-text-muted">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("nullable")} />
            Får vara tomt (null)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("unique")} />
            Unikt
          </label>
        </div>

        <FormRootError error={errors.root} />
        <FormActions
          isSubmitting={isSubmitting}
          submitLabel={field ? "Spara" : "Skapa fält"}
          onCancel={onClose}
          size="md"
          className="flex items-center justify-end gap-2.5 pt-2"
        />
      </form>
    </Drawer>
  )
}
