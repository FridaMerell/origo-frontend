"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { Checkbox, Field, fieldInputClass, TextArea } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import type { FluxEntity, FluxProvider, FluxResource } from "@/app/lib/dal"
import { saveProvider } from "./_actions/provider"

type ProviderValues = { name: string; description: string }

function words(value: string) {
  return value.match(/[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+\d*|[A-Z]+\d*|\d+/g) ?? []
}

function pascal(value: string) {
  return words(value)
    .map((word) => word === word.toUpperCase()
      ? word.slice(0, 1) + word.slice(1).toLowerCase()
      : word.slice(0, 1).toUpperCase() + word.slice(1))
    .join("")
}

function snake(value: string) {
  return words(value).map((word) => word.toLowerCase()).join("_")
}

function providerSource(name: string, resources: FluxResource[], entityById: Map<number, FluxEntity>) {
  const providerName = pascal(name.trim() || "Provider")
  const clients = [...resources].sort((a, b) => (entityById.get(a.entity)?.name ?? "").localeCompare(entityById.get(b.entity)?.name ?? ""))
  const apiNames = clients.map((resource) => pascal(entityById.get(resource.entity)?.name ?? resource.path) + "Api")
  const contextName = providerName + "Context"
  const apiList = apiNames.join(", ")

  return [
    '"use client";',
    "",
    'import { createContext, useContext, type ReactNode } from "react";',
    'import { ' + apiList + ' } from "../api";',
    "",
    "const " + contextName + " = createContext({" + apiList + "});",
    "",
    "export function " + providerName + "Provider({ children }: { children: ReactNode }) {",
    "  return <" + contextName + ".Provider value={{" + apiList + "}}>{children}</" + contextName + ".Provider>;",
    "}",
    "",
    "export function use" + providerName + "() {",
    "  return useContext(" + contextName + ");",
    "}",
    "",
  ].join("\n")
}

export function ProviderGeneratorForm({
  projectId,
  entities,
  resources,
  provider,
  generatedCode,
}: {
  projectId: string
  entities: FluxEntity[]
  resources: FluxResource[]
  provider?: FluxProvider
  generatedCode?: string
}) {
  const router = useRouter()
  const { register, handleSubmit, setError, control, formState: { errors, isSubmitting } } = useForm<ProviderValues>({
    defaultValues: { name: provider?.name ?? "", description: provider?.description ?? "" },
  })
  const [selectedResources, setSelectedResources] = useState<number[]>(provider?.resources ?? [])
  const submit = useSubmitAction(setError)
  const entityById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities])
  const selected = resources.filter((resource) => selectedResources.includes(resource.id))
  const name = useWatch({ control, name: "name" }) ?? ""
  const preview = providerSource(name, selected, entityById)
  const outputPath = "providers/" + snake(name.trim() || "provider") + "-provider.tsx"

  const toggleResource = (resourceId: number, checked: boolean) => {
    setSelectedResources((current) => checked ? [...new Set([...current, resourceId])] : current.filter((id) => id !== resourceId))
  }

  const onSubmit = handleSubmit(async (values) => {
    if (selectedResources.length === 0) {
      setError("root", { message: "En Provider måste välja minst en Resource." })
      return
    }
    await submit(
      () => saveProvider({
        id: provider?.id,
        payload: {
          project: Number(projectId),
          name: values.name.trim(),
          description: values.description.trim(),
          resources: selectedResources,
        },
      }),
      () => {
        router.push("/model/frontend")
        router.refresh()
      },
    )
  })

  const usesStoredOutput = Boolean(
    provider
    && selectedResources.length === provider.resources.length
    && selectedResources.every((id) => provider.resources.includes(id))
    && generatedCode,
  )

  return (
    <form onSubmit={onSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-5">
        <FormRootError error={errors.root} />
        <Field label="Provider-namn" error={errors.name as never}>
          <input className={fieldInputClass} placeholder="t.ex. ReadingData" {...register("name", { required: "Namn krävs." })} />
        </Field>
        <Field label="Ansvar och avgränsning" error={errors.description as never}>
          <TextArea rows={4} {...register("description")} />
        </Field>
        <fieldset className="border-y border-border py-4">
          <legend className="pr-2 text-sm text-text-muted">Resources som providern äger</legend>
          <p className="mt-1 text-xs leading-5 text-text-faint">Entitetstäckning härleds från dessa Resources och sparas inte som ett separat val.</p>
          <div className="mt-4 divide-y divide-border">
            {resources.map((resource) => (
              <div key={resource.id} className="flex flex-col items-start gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <Checkbox label={resource.path} checked={selectedResources.includes(resource.id)} onChange={(event) => toggleResource(resource.id, event.target.checked)} />
                <span className="font-mono text-xs text-text-faint">{entityById.get(resource.entity)?.name ?? "#" + resource.entity}</span>
              </div>
            ))}
            {resources.length === 0 && <p className="py-3 text-sm text-text-muted">Skapa minst en Resource innan en Provider kan definieras.</p>}
          </div>
        </fieldset>
        <FormActions isSubmitting={isSubmitting} submitLabel={provider ? "Spara provider" : "Skapa provider"} onCancel={() => router.push("/model/frontend")} size="md" />
      </div>

      <section className="border-y border-border py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-text-faint">Interaktiv provider-generator</p>
            <h2 className="mt-1 font-semibold text-text">{outputPath}</h2>
          </div>
          <p className="text-xs text-text-muted">{selected.length} valda Resources</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-text-muted">Förhandsvisningen uppdateras när namn eller Resources ändras och följer Python-generatorns provider_files-format.</p>
        {generatedCode && <p className="mt-3 border-l-2 border-accent pl-3 text-xs text-text-muted">Det sparade scaffold-resultatet visas när urvalet motsvarar den publicerade Provider-konfigurationen.</p>}
        <pre className="mt-4 max-h-[30rem] overflow-auto border-y border-border py-4 font-mono text-[11px] leading-5 text-text sm:max-h-[42rem] sm:text-xs">{usesStoredOutput ? generatedCode : preview}</pre>
      </section>
    </form>
  )
}
