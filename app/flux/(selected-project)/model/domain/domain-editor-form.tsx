"use client"

import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { Checkbox, Field, fieldInputClass, TextArea } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import type { FluxEntity, FluxField, FluxFieldType, FluxRelation, FluxRelationKind, FluxRelationOnDelete } from "@/app/lib/dal"
import { saveDomainContract, type DomainContractKind } from "./_actions/contracts"

type Values = Record<string, string>

const fieldTypes: FluxFieldType[] = [
  "string", "text", "int", "bigint", "decimal", "float", "bool", "date",
  "datetime", "time", "uuid", "json", "email", "url",
]
const relationKinds: FluxRelationKind[] = ["fk", "m2m", "o2o"]
const deleteOptions: FluxRelationOnDelete[] = ["cascade", "protect", "set_null"]

export function DomainEditorForm({
  kind,
  projectId,
  entities,
  entity,
  field,
  relation,
}: {
  kind: DomainContractKind
  projectId: string
  entities: FluxEntity[]
  entity?: FluxEntity
  field?: FluxField
  relation?: FluxRelation
}) {
  const router = useRouter()
  const record = entity ?? field ?? relation
  const defaults: Values = kind === "entity"
    ? { name: entity?.name ?? "", description: entity?.description ?? "" }
    : kind === "field"
      ? {
          entity: String(field?.entity ?? entities[0]?.id ?? ""),
          name: field?.name ?? "",
          type: field?.type ?? "string",
          description: field?.description ?? "",
          default: field?.default ?? "",
          max_length: field?.max_length === null || field?.max_length === undefined ? "" : String(field.max_length),
          order: String(field?.order ?? 0),
          nullable: String(field?.nullable ?? false),
          unique: String(field?.unique ?? false),
        }
      : {
          source: String(relation?.source ?? entities[0]?.id ?? ""),
          target: String(relation?.target ?? entities[0]?.id ?? ""),
          kind: relation?.kind ?? "fk",
          name: relation?.name ?? "",
          related_name: relation?.related_name ?? "",
          on_delete: relation?.on_delete ?? "cascade",
          nullable: String(relation?.nullable ?? false),
          description: relation?.description ?? "",
        }
  const { register, handleSubmit, setError, setValue, control, formState: { errors, isSubmitting } } = useForm<Values>({ defaultValues: defaults })
  const submit = useSubmitAction(setError)
  const nullable = useWatch({ control, name: "nullable" }) === "true"
  const unique = useWatch({ control, name: "unique" }) === "true"

  const onSubmit = handleSubmit(async (values) => {
    const payload = kind === "entity"
      ? { project: Number(projectId), name: values.name.trim(), description: values.description.trim() }
      : kind === "field"
        ? {
            entity: Number(values.entity),
            name: values.name.trim(),
            type: values.type,
            description: values.description.trim(),
            nullable: values.nullable === "true",
            unique: values.unique === "true",
            default: values.default,
            max_length: values.max_length.trim() ? Number(values.max_length) : null,
            order: Number(values.order),
          }
        : {
            source: Number(values.source),
            target: Number(values.target),
            kind: values.kind,
            name: values.name.trim(),
            related_name: values.related_name.trim(),
            on_delete: values.on_delete,
            nullable: values.nullable === "true",
            description: values.description.trim(),
          }
    await submit(
      () => saveDomainContract({ kind, id: record?.id, payload }),
      () => {
        router.push("/model/domain")
        router.refresh()
      },
    )
  })

  const setChecked = (name: "nullable" | "unique", checked: boolean) => setValue(name, String(checked), { shouldDirty: true })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormRootError error={errors.root} />

      {kind === "entity" && (
        <>
          <Field label="Entitetsnamn" error={errors.name as never}>
            <input className={fieldInputClass} placeholder="t.ex. Project" {...register("name", { required: "Namn krävs." })} />
          </Field>
          <Field label="Beskrivning">
            <TextArea rows={4} {...register("description")} />
          </Field>
        </>
      )}

      {kind === "field" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entitet" error={errors.entity as never}>
              <select className={fieldInputClass} {...register("entity", { required: "Välj entitet." })}>
                <option value="">Välj entitet</option>
                {entities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="Fältnamn" error={errors.name as never}>
              <input className={fieldInputClass} placeholder="t.ex. title" {...register("name", { required: "Namn krävs." })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Datatyp">
              <select className={fieldInputClass} {...register("type")}>
                {fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Maxlängd">
              <input type="number" min="1" className={fieldInputClass} {...register("max_length")} />
            </Field>
            <Field label="Ordning">
              <input type="number" min="0" className={fieldInputClass} {...register("order")} />
            </Field>
          </div>
          <Field label="Standardvärde">
            <input className={fieldInputClass} {...register("default")} />
          </Field>
          <div className="flex flex-wrap gap-5 border-y border-border py-4">
            <input type="hidden" {...register("nullable")} />
            <input type="hidden" {...register("unique")} />
            <Checkbox
              label="Fältet får vara tomt"
              checked={nullable}
              onChange={(event) => setChecked("nullable", event.target.checked)}
            />
            <Checkbox
              label="Unikt värde"
              checked={unique}
              onChange={(event) => setChecked("unique", event.target.checked)}
            />
          </div>
          <Field label="Beskrivning">
            <TextArea rows={4} {...register("description")} />
          </Field>
        </>
      )}

      {kind === "relation" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Från-entitet" error={errors.source as never}>
              <select className={fieldInputClass} {...register("source", { required: "Välj källa." })}>
                <option value="">Välj källa</option>
                {entities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="Till-entitet" error={errors.target as never}>
              <select className={fieldInputClass} {...register("target", { required: "Välj mål." })}>
                <option value="">Välj mål</option>
                {entities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Relationsnamn" error={errors.name as never}>
              <input className={fieldInputClass} placeholder="t.ex. owner" {...register("name", { required: "Namn krävs." })} />
            </Field>
            <Field label="Omvänt namn">
              <input className={fieldInputClass} {...register("related_name")} />
            </Field>
            <Field label="Typ">
              <select className={fieldInputClass} {...register("kind")}>
                {relationKinds.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-5 border-y border-border py-4">
            <Field label="Vid borttagning">
              <select className={fieldInputClass} {...register("on_delete")}>
                {deleteOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <input type="hidden" {...register("nullable")} />
            <Checkbox
              label="Relationen får vara tom"
              checked={nullable}
              onChange={(event) => setChecked("nullable", event.target.checked)}
            />
          </div>
          <Field label="Beskrivning">
            <TextArea rows={4} {...register("description")} />
          </Field>
        </>
      )}

      <FormActions
        isSubmitting={isSubmitting}
        submitLabel={record ? "Spara ändringar" : kind === "entity" ? "Skapa entitet" : kind === "field" ? "Skapa fält" : "Skapa relation"}
        onCancel={() => router.push("/model/domain")}
        size="md"
      />
    </form>
  )
}
