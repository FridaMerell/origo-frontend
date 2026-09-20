"use client"

import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { saveScreen } from "@/app/actions/flux/design"
import { fluxScreenFormSchema, type FluxScreenFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { CheckboxGroup } from "@/app/components/form/CheckboxGroup"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxEntity, FluxScreen } from "@/app/lib/dal"

const defaults = (screen?: FluxScreen): FluxScreenFormValues => ({
  name: screen?.name ?? "",
  route: screen?.route ?? "",
  description: screen?.description ?? "",
  entities: screen?.entities ?? [],
  parent: screen?.parent ?? null,
})

export function ScreenFormDrawer({
  open,
  onClose,
  projectId,
  screen,
  screens,
  entities,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  screen?: FluxScreen
  screens: FluxScreen[]
  entities: FluxEntity[]
  onSaved: (screen: FluxScreen) => void
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxScreenFormValues>({
    resolver: zodResolver(fluxScreenFormSchema),
    defaultValues: defaults(screen),
  })

  useEffect(() => {
    if (!open) return
    reset(defaults(screen))
  }, [open, screen, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = await saveScreen(projectId, screen?.id ?? null, data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Skärmen kunde inte sparas." })
      return
    }
    onSaved(result.data)
    onClose()
  })

  return (
    <Drawer
      title={screen ? "Redigera skärm" : "Ny skärm"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <div className="grid gap-4.5 sm:grid-cols-2">
          <Field label="Namn" error={errors.name}>
            <input type="text" placeholder="t.ex. Orderlista" className={fieldInputClass} {...register("name")} />
          </Field>
          <Field label="Route" error={errors.route}>
            <input type="text" placeholder="t.ex. /orders" className={fieldInputClass} {...register("route")} />
          </Field>
        </div>

        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={2} className={fieldInputClass} {...register("description")} />
        </Field>

        <Field label="Överordnad skärm" error={errors.parent}>
          <select className={fieldInputClass} {...register("parent")}>
            <option value="">Ingen</option>
            {screens
              .filter((item) => item.id !== screen?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>{item.name} ({item.route})</option>
              ))}
          </select>
        </Field>

        <Controller
          control={control}
          name="entities"
          render={({ field }) => (
            <CheckboxGroup
              label="Entiteter på skärmen"
              options={entities.map((entity) => ({ value: entity.id, label: entity.name }))}
              value={field.value}
              onChange={field.onChange}
              emptyText="Skapa entiteter först."
            />
          )}
        />

        <FormRootError error={errors.root} />
        <FormActions
          isSubmitting={isSubmitting}
          submitLabel={screen ? "Spara" : "Skapa skärm"}
          onCancel={onClose}
          size="md"
          className="flex items-center justify-end gap-2.5 pt-2"
        />
      </form>
    </Drawer>
  )
}
