"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Checkbox, Field, fieldInputClass, TextArea } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import type { FluxApiOperation, FluxApiOperationResponse, FluxApiProjection, FluxEntity, FluxResource } from "@/app/lib/dal"
import { JsonTreeEditor } from "../json-tree-editor"
import { saveApiContract, type ApiContractKind } from "./_actions/api-contracts"

type Values = Record<string, string>
type ParameterRow = {
  id: string
  name: string
  location: "query" | "path" | "header" | "body"
  type: "string" | "number" | "boolean"
  required: boolean
  description: string
  defaultValue: string
}

let nextRow = 0
function rowId() {
  nextRow += 1
  return "row-" + nextRow
}

function parameterRows(value: unknown): ParameterRow[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: rowId(),
      name: String(item.name ?? ""),
      location: item.in === "path" || item.in === "header" || item.in === "body" ? item.in : "query",
      type: item.type === "number" || item.type === "boolean" ? item.type : "string",
      required: Boolean(item.required),
      description: String(item.description ?? ""),
      defaultValue: item.default === null || item.default === undefined ? "" : String(item.default),
    }))
}

function ParameterEditor({ rows, onChange }: { rows: ParameterRow[]; onChange: (rows: ParameterRow[]) => void }) {
  const update = (id: string, patch: Partial<ParameterRow>) => onChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row))
  const add = () => onChange([...rows, {
    id: rowId(),
    name: "",
    location: "query",
    type: "string",
    required: false,
    description: "",
    defaultValue: "",
  }])

  return (
    <section className="border-y border-border py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text">Parametrar</h3>
        </div>
        <button type="button" onClick={add} className="text-sm font-medium text-accent">Lägg till parameter</button>
      </div>
      <div className="mt-3 divide-y divide-border">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-3 py-3 md:grid-cols-[minmax(8rem,.8fr)_8rem_7rem_minmax(8rem,1fr)_7rem_auto]">
            <Field label="Namn"><input className={fieldInputClass} value={row.name} onChange={(event) => update(row.id, { name: event.target.value })} /></Field>
            <Field label="Plats">
              <select className={fieldInputClass} value={row.location} onChange={(event) => update(row.id, { location: event.target.value as ParameterRow["location"] })}>
                <option value="query">query</option><option value="path">path</option><option value="header">header</option><option value="body">body</option>
              </select>
            </Field>
            <Field label="Typ">
              <select className={fieldInputClass} value={row.type} onChange={(event) => update(row.id, { type: event.target.value as ParameterRow["type"] })}>
                <option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option>
              </select>
            </Field>
            <Field label="Beskrivning"><input className={fieldInputClass} value={row.description} onChange={(event) => update(row.id, { description: event.target.value })} /></Field>
            <Field label="Standardvärde"><input className={fieldInputClass} disabled={row.required || row.location === "path"} value={row.defaultValue} onChange={(event) => update(row.id, { defaultValue: event.target.value })} /></Field>
            <div className="flex items-end gap-2 pb-1">
              <Checkbox label="Krävs" checked={row.required || row.location === "path"} onChange={(event) => update(row.id, { required: event.target.checked })} />
              <button type="button" onClick={() => onChange(rows.filter((item) => item.id !== row.id))} className="text-xs text-text-muted hover:text-danger">Ta bort</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="py-3 text-sm text-text-muted">Inga parametrar.</p>}
      </div>
    </section>
  )
}

function outputParameters(rows: ParameterRow[]) {
  return rows.filter((row) => row.name.trim()).map((row) => ({
    name: row.name.trim(),
    in: row.location,
    type: row.type,
    required: row.location === "path" ? true : row.required,
    ...(row.description.trim() ? { description: row.description.trim() } : {}),
    ...(row.defaultValue.trim() ? {
      default: row.type === "number" ? Number(row.defaultValue) : row.type === "boolean" ? row.defaultValue === "true" : row.defaultValue,
    } : {}),
  }))
}

function emptyObject(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length === 0)
}

export function ApiEditorForm({
  kind,
  projectId,
  entities,
  resources,
  operations,
  projections,
  resource,
  operation,
  response,
  projection,
  backHref,
  defaultResourceId,
  defaultOperationId,
}: {
  kind: ApiContractKind
  projectId: string
  entities: FluxEntity[]
  resources: FluxResource[]
  operations: FluxApiOperation[]
  projections: FluxApiProjection[]
  resource?: FluxResource
  operation?: FluxApiOperation
  response?: FluxApiOperationResponse
  projection?: FluxApiProjection
  backHref: string
  defaultResourceId?: number
  defaultOperationId?: number
}) {
  const router = useRouter()
  const record = resource ?? operation ?? response ?? projection
  const defaults = useMemo<Values>(() => {
    const values: Values = {}

    if (kind === "resource") {
      values.entity = String(resource?.entity ?? entities[0]?.id ?? "")
      values.path = resource?.path ?? ""
    } else if (kind === "operation") {
      values.resource = String(operation?.resource ?? defaultResourceId ?? resources[0]?.id ?? "")
      values.key = operation?.key ?? "list"
      values.method = operation?.method ?? "GET"
      values.path = operation?.path ?? ""
      values.title = operation?.title ?? ""
      values.description = operation?.description ?? ""
    } else if (kind === "response") {
      values.operation = String(response?.operation ?? defaultOperationId ?? operations[0]?.id ?? "")
      values.status_code = String(response?.status_code ?? "200")
      values.description = response?.description ?? ""
      values.projection = String(response?.projection ?? "")
    } else {
      values.name = projection?.name ?? ""
      values.description = projection?.description ?? ""
    }

    return values
  }, [defaultOperationId, defaultResourceId, entities, kind, operation, operations, projection, resource, resources, response])
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ defaultValues: defaults })
  const [parameters, setParameters] = useState(() => parameterRows(operation?.parameters))
  const [requestSchema, setRequestSchema] = useState<unknown>(() => operation?.request_schema ?? {})
  const [pagination, setPagination] = useState<unknown>(() => operation?.pagination ?? {})
  const [projectionSchema, setProjectionSchema] = useState<unknown>(() => projection?.schema ?? { type: "object", properties: {} })
  const submit = useSubmitAction(setError)

  const onSubmit = handleSubmit(async (values) => {
    let payload: Record<string, unknown>
    if (kind === "resource") {
      payload = { entity: Number(values.entity), path: values.path.trim() }
    } else if (kind === "operation") {
      payload = {
        resource: Number(values.resource),
        key: values.key,
        method: values.method.trim().toUpperCase(),
        path: values.path.trim(),
        title: values.title.trim(),
        description: values.description.trim(),
        parameters: outputParameters(parameters),
        request_schema: emptyObject(requestSchema) ? null : requestSchema,
        pagination: emptyObject(pagination) ? null : pagination,
      }
    } else if (kind === "response") {
      payload = {
        operation: Number(values.operation),
        status_code: Number(values.status_code),
        description: values.description.trim(),
        projection: values.projection ? Number(values.projection) : null,
      }
    } else if (projectionSchema && typeof projectionSchema === "object" && !Array.isArray(projectionSchema)) {
      payload = {
        project: Number(projectId),
        name: values.name.trim(),
        description: values.description.trim(),
        schema: projectionSchema,
      }
    } else {
      setError("root", { message: "Svarsschema måste vara ett objekt." })
      return
    }

    await submit(
      () => saveApiContract({ kind, id: record?.id, payload }),
      () => {
        router.push(backHref)
        router.refresh()
      },
    )
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormRootError error={errors.root} />

      {kind === "resource" && (
        <>
          <Field label="Entitet" error={errors.entity as never}>
            <select className={fieldInputClass} {...register("entity", { required: "Välj entitet." })}>
              <option value="">Välj entitet</option>
              {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
            </select>
          </Field>
          <Field label="API-path" error={errors.path as never}>
            <input className={fieldInputClass} placeholder="t.ex. projects" {...register("path", { required: "Path krävs." })} />
          </Field>
          <p className="text-xs text-text-muted">Titel och beskrivning för Resource är skrivskyddade, härledda värden i den aktuella Python-serializern.</p>
        </>
      )}

      {kind === "operation" && (
        <>
          <Field label="Resurs" error={errors.resource as never}>
            <select className={fieldInputClass} {...register("resource", { required: "Välj resurs." })}>
              <option value="">Välj resurs</option>
              {resources.map((item) => <option key={item.id} value={item.id}>{item.path}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Operationsnyckel" error={errors.key as never}>
              <select className={fieldInputClass} {...register("key")}>
                <option value="list">list</option><option value="retrieve">retrieve</option><option value="create">create</option><option value="update">update</option><option value="delete">delete</option><option value="custom">custom</option>
              </select>
            </Field>
            <Field label="HTTP-metod" error={errors.method as never}>
              <input className={fieldInputClass} placeholder="GET" {...register("method", { required: "HTTP-metod krävs." })} />
            </Field>
          </div>
          <Field label="Path" error={errors.path as never}>
            <input className={fieldInputClass} placeholder="/projects/{id}/" {...register("path", { required: "Path krävs." })} />
          </Field>
          <Field label="Titel" error={errors.title as never}>
            <input className={fieldInputClass} {...register("title", { required: "Titel krävs." })} />
          </Field>
          <Field label="Beskrivning" error={errors.description as never}>
            <TextArea rows={3} {...register("description")} />
          </Field>
          <ParameterEditor rows={parameters} onChange={setParameters} />
          <JsonTreeEditor label="Request-schema" description="Valfria och nästlade request-kontrakt." value={requestSchema} onChange={setRequestSchema} />
          <JsonTreeEditor label="Paginering" description="Visuell trädbyggare för generatorns pagineringskontrakt och dess konfiguration." value={pagination} onChange={setPagination} />
        </>
      )}

      {kind === "response" && (
        <>
          <Field label="API-operation" error={errors.operation as never}>
            <select className={fieldInputClass} {...register("operation", { required: "Välj operation." })}>
              <option value="">Välj operation</option>
              {operations.map((item) => <option key={item.id} value={item.id}>{item.method} {item.path} · {item.title}</option>)}
            </select>
          </Field>
          <Field label="Statuskod" error={errors.status_code as never}>
            <input type="number" min="100" max="599" className={fieldInputClass} {...register("status_code", { required: "Statuskod krävs." })} />
          </Field>
          <Field label="Beskrivning" error={errors.description as never}>
            <TextArea rows={3} {...register("description")} />
          </Field>
          <Field label="Projektion">
            <select className={fieldInputClass} {...register("projection")}>
              <option value="">Bodyless response</option>
              {projections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
        </>
      )}

      {kind === "projection" && (
        <>
          <Field label="Namn" error={errors.name as never}>
            <input className={fieldInputClass} {...register("name", { required: "Namn krävs." })} />
          </Field>
          <Field label="Beskrivning" error={errors.description as never}>
            <TextArea rows={3} {...register("description")} />
          </Field>
          <JsonTreeEditor label="Svarsschema" description="Objekt, listor, fält och värden i svarets kontrakt." value={projectionSchema} onChange={setProjectionSchema} />
        </>
      )}

      <FormActions isSubmitting={isSubmitting} submitLabel={record ? "Spara ändringar" : "Skapa"} onCancel={() => router.push(backHref)} size="md" />
    </form>
  )
}
