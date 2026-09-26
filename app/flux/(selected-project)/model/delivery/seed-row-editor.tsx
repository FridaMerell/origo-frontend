"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Checkbox, Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import type { FluxEntity, FluxField, FluxRelation, FluxSeedRow } from "@/app/lib/dal"
import { JsonTreeEditor } from "../json-tree-editor"
import { saveSeedRow } from "./_actions/seed-row"

type Values = { order: string }

function numericType(type: FluxField["type"]) {
  return ["int", "bigint", "decimal", "float"].includes(type)
}

export function SeedRowEditor({ entities, fields, relations, row }: { entities: FluxEntity[]; fields: FluxField[]; relations: FluxRelation[]; row?: FluxSeedRow }) {
  const router = useRouter()
  const [entityId, setEntityId] = useState<number | "">(row?.entity ?? entities[0]?.id ?? "")
  const [data, setData] = useState<Record<string, unknown>>(row?.data ?? {})
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ defaultValues: { order: String(row?.order ?? 0) } })
  const submit = useSubmitAction(setError)
  const selectedFields = useMemo(() => fields.filter((field) => field.entity === entityId).sort((a, b) => a.order - b.order), [entityId, fields])
  const selectedRelations = useMemo(() => relations.filter((relation) => relation.source === entityId), [entityId, relations])
  const setValue = (key: string, value: unknown) => setData((current) => ({ ...current, [key]: value }))

  const onSubmit = handleSubmit(async (values) => {
    if (!entityId) { setError("root", { message: "Välj entitet." }); return }
    await submit(() => saveSeedRow({ id: row?.id, payload: { entity: Number(entityId), order: Number(values.order), data } }), () => { router.push("/model/delivery"); router.refresh() })
  })

  return <form onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-5"><FormRootError error={errors.root} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Entitet"><select className={fieldInputClass} value={entityId} onChange={(event) => { setEntityId(event.target.value ? Number(event.target.value) : ""); setData({}) }}><option value="">Välj entitet</option>{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></Field><Field label="Sorteringsordning"><input type="number" min="0" className={fieldInputClass} {...register("order", { required: "Ordning krävs." })} /></Field></div><section className="border-y border-border py-4"><div><h2 className="font-semibold text-text">Fältvärden</h2><p className="mt-1 text-xs text-text-muted">Fälten kommer från vald Entity. Bara kända fältnamn och relationer kan sparas.</p></div><div className="mt-4 space-y-4">{selectedFields.map((field) => field.type === "bool" ? <Checkbox key={field.id} label={field.name} checked={Boolean(data[field.name])} onChange={(event) => setValue(field.name, event.target.checked)} /> : field.type === "json" ? <JsonTreeEditor key={field.id} label={field.name} description={field.description || "Strukturerat JSON-fält."} value={data[field.name] ?? {}} onChange={(value) => setValue(field.name, value)} /> : <Field key={field.id} label={`${field.name} · ${field.type}${field.nullable ? " | null" : ""}`}><input type={numericType(field.type) ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "time" ? "time" : "text"} className={fieldInputClass} value={data[field.name] === undefined || data[field.name] === null ? "" : String(data[field.name])} onChange={(event) => setValue(field.name, numericType(field.type) && event.target.value ? Number(event.target.value) : event.target.value)} /></Field>)}{selectedFields.length === 0 && <p className="text-sm text-text-muted">Välj en entitet för att se dess fält.</p>}</div></section><section className="border-y border-border py-4"><h2 className="font-semibold text-text">Relationsvärden</h2><div className="mt-4 space-y-4">{selectedRelations.map((relation) => relation.kind === "m2m" ? <JsonTreeEditor key={relation.id} label={`${relation.name} · många-till-många`} description="Lista med relaterade ID:n." value={data[relation.name] ?? []} onChange={(value) => setValue(relation.name, value)} rootKind="array" /> : <Field key={relation.id} label={`${relation.name} · ${relation.kind}`}><input type="number" className={fieldInputClass} value={data[relation.name] === undefined || data[relation.name] === null ? "" : String(data[relation.name])} onChange={(event) => setValue(relation.name, event.target.value ? Number(event.target.value) : null)} /></Field>)}{selectedRelations.length === 0 && <p className="text-sm text-text-muted">Entiteten har inga utgående relationer.</p>}</div></section><FormActions isSubmitting={isSubmitting} submitLabel={row ? "Spara seedrad" : "Skapa seedrad"} onCancel={() => router.push("/model/delivery")} size="md" /></form>
}
