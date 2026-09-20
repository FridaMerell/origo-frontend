"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createEntity, updateEntity } from "@/app/actions/flux/datamodel"
import { fluxEntityFormSchema, type FluxEntityFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxEntity } from "@/app/lib/dal"

export function EntityFormDrawer({
  open,
  onClose,
  projectId,
  entity,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  entity?: FluxEntity
  onSaved: (entity: FluxEntity) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxEntityFormValues>({
    resolver: zodResolver(fluxEntityFormSchema),
    defaultValues: { name: entity?.name ?? "", description: entity?.description ?? "" },
  })

  useEffect(() => {
    if (!open) return
    reset({ name: entity?.name ?? "", description: entity?.description ?? "" })
  }, [open, entity, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = entity ? await updateEntity(entity.id, data) : await createEntity(projectId, data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Entiteten kunde inte sparas." })
      return
    }
    onSaved(result.data)
    onClose()
  })

  return (
    <Drawer
      title={entity ? "Redigera entitet" : "Ny entitet"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <Field label="Namn" error={errors.name}>
          <input type="text" placeholder="t.ex. Order" className={fieldInputClass} {...register("name")} />
        </Field>

        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={3} className={fieldInputClass} {...register("description")} />
        </Field>

        <FormRootError error={errors.root} />
        <FormActions
          isSubmitting={isSubmitting}
          submitLabel={entity ? "Spara" : "Skapa entitet"}
          onCancel={onClose}
          size="md"
          className="flex items-center justify-end gap-2.5 pt-2"
        />
      </form>
    </Drawer>
  )
}
