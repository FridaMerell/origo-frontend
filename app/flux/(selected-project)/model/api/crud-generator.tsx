"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { Button } from "@/app/components/ui/Button"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import type { FluxApiOperation, FluxEntity, FluxResource } from "@/app/lib/dal"
import { generateAllCrud, generateCrud } from "./_actions/api-contracts"

const crudKeys = ["list", "retrieve", "create", "update", "delete"] as const

function defaultPath(name: string) {
  const words = name.match(/[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|\d+/g) ?? [name]
  const base = words.map((word) => word.toLocaleLowerCase("sv-SE")).join("-")
  if (/(s|x|z|ch|sh)$/.test(base)) return base + "es"
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ies"
  return base + "s"
}

export function CrudGenerator({
  entities,
  resources,
  operations,
}: {
  entities: FluxEntity[]
  resources: FluxResource[]
  operations: FluxApiOperation[]
}) {
  const router = useRouter()
  const [batchPending, startBatch] = useTransition()
  const [batchMessage, setBatchMessage] = useState<string | null>(null)
  const { register, handleSubmit, setError, setValue, control, formState: { errors, isSubmitting } } = useForm<{ entity: string; path: string }>({
    defaultValues: { entity: String(entities[0]?.id ?? ""), path: entities[0] ? defaultPath(entities[0].name) : "" },
  })
  const entityId = useWatch({ control, name: "entity" })
  const selectedPath = useWatch({ control, name: "path" })
  const selectedEntity = entities.find((entity) => String(entity.id) === entityId)
  const resource = resources.find((item) => item.entity === selectedEntity?.id)
  const existingOperationKeys = operations.filter((operation) => operation.resource === resource?.id).map((operation) => operation.key)
  const missingKeys = crudKeys.filter((key) => !existingOperationKeys.includes(key))
  const submit = useSubmitAction(setError)

  const workItems = entities.map((entity) => {
    const itemResource = resources.find((item) => item.entity === entity.id)
    const itemKeys = operations.filter((operation) => operation.resource === itemResource?.id).map((operation) => operation.key)
    return {
      entityId: entity.id,
      entityName: entity.name,
      resourceId: itemResource?.id,
      resourcePath: itemResource?.path ?? defaultPath(entity.name),
      existingOperationKeys: itemKeys,
      missingKeys: crudKeys.filter((key) => !itemKeys.includes(key)),
    }
  })
  const incompleteItems = workItems.filter((item) => item.missingKeys.length > 0)
  const completeCount = workItems.length - incompleteItems.length
  const newResourceCount = incompleteItems.filter((item) => !item.resourceId).length
  const newOperationCount = incompleteItems.reduce((count, item) => count + item.missingKeys.length, 0)

  useEffect(() => {
    if (!selectedEntity) return
    setValue("path", resource?.path ?? defaultPath(selectedEntity.name))
  }, [resource?.path, selectedEntity, setValue])

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedEntity) {
      setError("root", { message: "Välj en Entity först." })
      return
    }

    let targetResourceId = resource?.id
    await submit(
      async () => {
        const result = await generateCrud({
          entityId: selectedEntity.id,
          entityName: selectedEntity.name,
          resourceId: resource?.id,
          resourcePath: resource?.path ?? values.path,
          existingOperationKeys,
        })
        targetResourceId = result.data?.resourceId
        return result
      },
      () => {
        router.refresh()
        if (targetResourceId) router.push("/model/api/resources/" + targetResourceId)
      },
    )
  })

  const generateAll = () => {
    setBatchMessage(null)
    startBatch(async () => {
      const result = await generateAllCrud({ items: incompleteItems })
      if ("error" in result) {
        const summary = "data" in result ? result.data : null
        const progress = summary && (summary.createdResources || summary.createdOperations)
          ? " " + summary.createdResources + " Resources och " + summary.createdOperations + " operationer skapades före felet."
          : ""
        setBatchMessage(result.error + progress)
        return
      }

      const summary = result.data
      setBatchMessage(summary.createdResources + " Resources och " + summary.createdOperations + " operationer skapades för " + summary.completedEntities + " Entities.")
      router.refresh()
    })
  }

  const path = resource?.path ?? selectedPath

  return (
    <section id="standard-crud" className="border-t border-border">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface-2 px-4 py-4 sm:items-end sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">API-grund</p>
          <h2 className="mt-1 text-xl font-semibold text-text">Standard-CRUD</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">Skapa eller komplettera Resource, list, retrieve, create, update och delete från domänmodellen.</p>
        </div>
        <span className="font-mono text-sm text-text-muted">{completeCount} / {entities.length} klara</span>
      </header>

      <div className="grid gap-4 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5 sm:items-center">
        <div>
          <h3 className="font-medium text-text">Alla Entities</h3>
          <p className="mt-1 text-sm text-text-muted">
            {incompleteItems.length
              ? newResourceCount + " Resources och " + newOperationCount + " operationer behöver skapas eller kompletteras."
              : "Alla Entities har standard-CRUD."}
          </p>
        </div>
        <Button type="button" variant="primary" size="sm" disabled={batchPending || incompleteItems.length === 0} onClick={generateAll} className="min-h-10 w-full justify-center rounded-xl sm:w-auto">
          {batchPending ? "Genererar all CRUD..." : "Generera all CRUD"}
        </Button>
      </div>

      {batchMessage && <p role="status" className="border-t border-border px-4 py-3 text-sm text-text-muted sm:px-5">{batchMessage}</p>}

      {entities.length > 0 && (
        <details className="border-t border-border px-4 py-4 sm:px-5">
          <summary className="cursor-pointer font-medium text-text">Generera för en Entity</summary>
          <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-[minmax(12rem,.8fr)_minmax(0,1fr)_auto] sm:items-end">
            <Field label="Entity">
              <select className={fieldInputClass} {...register("entity", { required: "Välj en Entity." })}>
                {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
              </select>
            </Field>
            <Field label={resource ? "Resource-path" : "Föreslaget API-path"}>
              <input className={fieldInputClass} disabled={Boolean(resource)} {...register("path", { required: "API-path krävs." })} />
            </Field>
            <div>
              <FormRootError error={errors.root} />
              {resource && missingKeys.length === 0 ? (
                <Link href={"/model/api/resources/" + resource.id} className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-accent/40 px-3 text-sm font-medium text-accent no-underline hover:bg-accent/10 sm:w-auto">
                  CRUD är klart
                </Link>
              ) : (
                <FormActions
                  isSubmitting={isSubmitting}
                  submitLabel={resource ? "Komplettera CRUD" : "Generera CRUD"}
                  pendingLabel="Genererar CRUD..."
                  className="mt-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
                  size="sm"
                />
              )}
            </div>
          </form>

          {selectedEntity && (
            <div className="mt-4 divide-y divide-border border-y border-border text-sm">
              <p className="py-2 text-text-muted">
                {resource ? <>Resource: <span className="font-mono text-text">{resource.path}</span></> : <>Ny Resource: <span className="font-mono text-text">{path || "ange path ovan"}</span></>}
                <span className="ml-2 font-mono text-xs text-accent">{missingKeys.length ? missingKeys.join(" · ") : "alla CRUD-operationer finns"}</span>
              </p>
              <p className="py-2 font-mono text-xs leading-5 text-text-muted">
                GET /{resource?.path ?? path}/ · GET /{resource?.path ?? path}/{"{id}"}/ · POST · PATCH · DELETE
              </p>
            </div>
          )}
        </details>
      )}
    </section>
  )
}
