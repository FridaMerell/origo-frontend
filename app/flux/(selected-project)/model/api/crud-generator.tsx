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
      setError("root", { message: "Välj en entitet först." })
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
          ? " " + summary.createdResources + " resurser och " + summary.createdOperations + " operationer skapades före felet."
          : ""
        setBatchMessage(result.error + progress)
        return
      }

      const summary = result.data
      setBatchMessage(summary.createdResources + " resurser och " + summary.createdOperations + " operationer skapades för " + summary.completedEntities + " entiteter.")
      router.refresh()
    })
  }

  const path = resource?.path ?? selectedPath

  return (
    <section id="standard-crud" data-model-section="Standard-CRUD" className="scroll-mt-24 overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3.5 sm:px-5">
        <h2 className="text-base font-semibold text-text">Standard-CRUD</h2>
        <span className="text-sm tabular-nums text-text-muted">{completeCount} av {entities.length} entiteter klara</span>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-sm leading-6 text-text-muted">
          {entities.length === 0
            ? "Skapa entiteter i domänmodellen först, sedan kan list, retrieve, create, update och delete genereras här."
            : incompleteItems.length
              ? newResourceCount + " resurser och " + newOperationCount + " operationer saknas för att alla entiteter ska ha list, retrieve, create, update och delete."
              : "Alla entiteter har list, retrieve, create, update och delete."}
        </p>
        <Button type="button" variant="primary" size="sm" disabled={batchPending || incompleteItems.length === 0} onClick={generateAll} className="min-h-9 shrink-0 justify-center rounded-md">
          {batchPending ? "Genererar all CRUD..." : "Generera all CRUD"}
        </Button>
      </div>

      {batchMessage && <p role="status" className="border-t border-border px-4 py-3 text-sm text-text-muted sm:px-5">{batchMessage}</p>}

      {entities.length > 0 && (
        <details className="border-t border-border px-4 py-4 sm:px-5">
          <summary className="cursor-pointer text-sm font-medium text-text">Generera för en entitet</summary>
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end [&>*]:min-w-0 [&>*:nth-child(-n+2)]:flex-1">
            <Field label="Entitet">
              <select className={fieldInputClass} {...register("entity", { required: "Välj en entitet." })}>
                {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
              </select>
            </Field>
            <Field label={resource ? "Resursens sökväg" : "Föreslagen sökväg"}>
              <input className={fieldInputClass} disabled={Boolean(resource)} {...register("path", { required: "API-path krävs." })} />
            </Field>
            <div>
              <FormRootError error={errors.root} />
              {resource && missingKeys.length === 0 ? (
                <Link href={"/model/api/resources/" + resource.id} className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-text no-underline hover:border-accent/50 hover:text-accent">
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
                {resource ? <>Resurs: <span className="font-mono text-text">{resource.path}</span></> : <>Ny resurs: <span className="font-mono text-text">{path || "ange path ovan"}</span></>}
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
