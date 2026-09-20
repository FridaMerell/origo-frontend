"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createRelation, updateRelation } from "@/app/actions/flux/datamodel"
import { fluxRelationFormSchema, type FluxRelationFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import type { FluxEntity, FluxRelation, FluxRelationKind, FluxRelationOnDelete } from "@/app/lib/dal"

export const RELATION_KIND_LABELS: Record<FluxRelationKind, string> = {
  fk: "Främmande nyckel (många till en)",
  o2o: "En till en",
  m2m: "Många till många",
}

const ON_DELETE_LABELS: Record<FluxRelationOnDelete, string> = {
  cascade: "Ta bort tillsammans (cascade)",
  protect: "Förhindra borttagning (protect)",
  set_null: "Nollställ (set null)",
}

const defaultValues = (sourceId: number, entities: FluxEntity[], relation?: FluxRelation): FluxRelationFormValues => ({
  source: relation?.source ?? sourceId,
  target: relation?.target ?? entities.find((entity) => entity.id !== sourceId)?.id ?? sourceId,
  kind: relation?.kind ?? "fk",
  name: relation?.name ?? "",
  related_name: relation?.related_name ?? "",
  on_delete: relation?.on_delete ?? "cascade",
  nullable: relation?.nullable ?? false,
  description: relation?.description ?? "",
})

export function RelationFormDrawer({
  open,
  onClose,
  sourceId,
  entities,
  relation,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  sourceId: number
  entities: FluxEntity[]
  relation?: FluxRelation
  onSaved: (relation: FluxRelation) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxRelationFormValues>({
    resolver: zodResolver(fluxRelationFormSchema),
    defaultValues: defaultValues(sourceId, entities, relation),
  })

  useEffect(() => {
    if (!open) return
    reset(defaultValues(sourceId, entities, relation))
  }, [open, sourceId, entities, relation, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = relation ? await updateRelation(relation.id, data) : await createRelation(data)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Relationen kunde inte sparas." })
      return
    }
    onSaved(result.data)
    onClose()
  })

  return (
    <Drawer
      title={relation ? "Redigera relation" : "Ny relation"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <Field label="Namn" error={errors.name}>
          <input type="text" placeholder="t.ex. customer" className={fieldInputClass} {...register("name")} />
        </Field>

        <div className="grid gap-4.5 sm:grid-cols-2">
          <Field label="Från (source)" error={errors.source}>
            <select className={fieldInputClass} {...register("source")}>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>{entity.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Till (target)" error={errors.target}>
            <select className={fieldInputClass} {...register("target")}>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>{entity.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Typ" error={errors.kind}>
          <select className={fieldInputClass} {...register("kind")}>
            {Object.entries(RELATION_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4.5 sm:grid-cols-2">
          <Field label="Omvänt namn (related_name)" error={errors.related_name}>
            <input type="text" className={fieldInputClass} {...register("related_name")} />
          </Field>
          <Field label="Vid borttagning" error={errors.on_delete}>
            <select className={fieldInputClass} {...register("on_delete")}>
              {Object.entries(ON_DELETE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={2} className={fieldInputClass} {...register("description")} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" {...register("nullable")} />
          Får vara tom (null)
        </label>

        <FormRootError error={errors.root} />
        <FormActions
          isSubmitting={isSubmitting}
          submitLabel={relation ? "Spara" : "Skapa relation"}
          onCancel={onClose}
          size="md"
          className="flex items-center justify-end gap-2.5 pt-2"
        />
      </form>
    </Drawer>
  )
}
