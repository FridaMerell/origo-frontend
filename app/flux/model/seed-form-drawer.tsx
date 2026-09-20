"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { saveSeedRow } from "@/app/actions/flux/design"
import { fluxSeedRowFormSchema, type FluxSeedRowFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxEntity, FluxField, FluxSeedRow } from "@/app/lib/dal"

const defaults = (entity: FluxEntity, fields: FluxField[], row?: FluxSeedRow): FluxSeedRowFormValues => ({
  entity: entity.id,
  data: JSON.stringify(row?.data ?? Object.fromEntries(fields.map((field) => [field.name, ""])), null, 2),
})

export function SeedFormDrawer({
  open,
  onClose,
  entity,
  fields,
  nextOrder,
  row,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  entity: FluxEntity
  fields: FluxField[]
  nextOrder: number
  row?: FluxSeedRow
  onSaved: (row: FluxSeedRow) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxSeedRowFormValues>({
    resolver: zodResolver(fluxSeedRowFormSchema),
    defaultValues: defaults(entity, fields, row),
  })

  useEffect(() => {
    if (!open) return
    reset(defaults(entity, fields, row))
  }, [open, entity, fields, row, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = await saveSeedRow(row?.id ?? null, nextOrder, data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Raden kunde inte sparas." })
      return
    }
    onSaved(result.data)
    onClose()
  })

  return (
    <Drawer
      title={`${row ? "Redigera" : "Ny"} rad för ${entity.name}`}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <Field label="Data (JSON-objekt)" error={errors.data}>
          <textarea rows={12} spellCheck={false} className={`${fieldInputClass} font-mono text-xs`} {...register("data")} />
        </Field>
        <FormRootError error={errors.root} />
        <FormActions
          isSubmitting={isSubmitting}
          submitLabel={row ? "Spara" : "Skapa rad"}
          onCancel={onClose}
          size="md"
          className="flex items-center justify-end gap-2.5 pt-2"
        />
      </form>
    </Drawer>
  )
}
