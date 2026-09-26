"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Checkbox, Field, fieldInputClass, TextArea } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import type { FluxApiOperation, FluxEntity, FluxRole, FluxRolePermission, FluxScreen } from "@/app/lib/dal"
import { saveFrontendContract, type FrontendContractKind } from "./_actions/contracts"

type Values = Record<string, string>

export function FrontendEditorForm({
  kind,
  projectId,
  entities,
  operations,
  roles,
  screens,
  screen,
  role,
  permission,
}: {
  kind: FrontendContractKind
  projectId: string
  entities: FluxEntity[]
  operations: FluxApiOperation[]
  roles: FluxRole[]
  screens: FluxScreen[]
  screen?: FluxScreen
  role?: FluxRole
  permission?: FluxRolePermission
}) {
  const router = useRouter()
  const record = screen ?? role ?? permission
  const [selectedEntities, setSelectedEntities] = useState<number[]>(screen?.entities ?? [])
  const defaults: Values = kind === "screen"
    ? {
        name: screen?.name ?? "",
        route: screen?.route ?? "",
        description: screen?.description ?? "",
        parent: screen?.parent === null || screen?.parent === undefined ? "" : String(screen.parent),
      }
    : kind === "role"
      ? { name: role?.name ?? "", description: role?.description ?? "" }
      : {
          role: String(permission?.role ?? roles[0]?.id ?? ""),
          api_operation: String(permission?.api_operation ?? operations[0]?.id ?? ""),
          scope: permission?.scope ?? "all",
        }
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ defaultValues: defaults })
  const submit = useSubmitAction(setError)

  const toggleEntity = (id: number, checked: boolean) => {
    setSelectedEntities((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id))
  }

  const onSubmit = handleSubmit(async (values) => {
    let savedRoleId = role?.id
    const payload = kind === "screen"
      ? {
          project: Number(projectId),
          name: values.name.trim(),
          route: values.route.trim(),
          description: values.description.trim(),
          entities: selectedEntities,
          parent: values.parent ? Number(values.parent) : null,
        }
      : kind === "role"
        ? { project: Number(projectId), name: values.name.trim(), description: values.description.trim() }
        : {
            role: Number(values.role),
            api_operation: Number(values.api_operation),
            scope: values.scope,
          }
    await submit(
      async () => {
        const result = await saveFrontendContract({ kind, id: record?.id, payload })
        if (kind === "role") savedRoleId = result.data?.id ?? savedRoleId
        return result
      },
      () => {
        if (kind === "role" && !record && savedRoleId) router.push("/model/frontend/roles/" + savedRoleId + "/edit")
        else router.push("/model/frontend")
        router.refresh()
      },
    )
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormRootError error={errors.root} />

      {kind === "screen" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Skärmnamn" error={errors.name as never}>
              <input className={fieldInputClass} placeholder="t.ex. Project overview" {...register("name", { required: "Namn krävs." })} />
            </Field>
            <Field label="Route" error={errors.route as never}>
              <input className={fieldInputClass} placeholder="/projects" {...register("route", { required: "Route krävs." })} />
            </Field>
          </div>
          <Field label="Beskrivning">
            <TextArea rows={4} {...register("description")} />
          </Field>
          <Field label="Förälderskärm">
            <select className={fieldInputClass} {...register("parent")}>
              <option value="">Ingen förälder</option>
              {screens.filter((item) => item.id !== screen?.id).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.route}</option>)}
            </select>
          </Field>
          <section className="border-y border-border py-4">
            <h2 className="font-semibold text-text">Relaterade entiteter</h2>
            <p className="mt-1 text-xs text-text-muted">Dessa kopplingar används i navigering och i dokumentationen för API-operationer.</p>
            <div className="mt-3 divide-y divide-border">
              {entities.map((entity) => (
                <div key={entity.id} className="py-3">
                  <Checkbox label={entity.name} checked={selectedEntities.includes(entity.id)} onChange={(event) => toggleEntity(entity.id, event.target.checked)} />
                </div>
              ))}
              {entities.length === 0 && <p className="py-3 text-sm text-text-muted">Skapa en entitet först.</p>}
            </div>
          </section>
        </>
      )}

      {kind === "role" && (
        <>
          <Field label="Rollnamn" error={errors.name as never}>
            <input className={fieldInputClass} placeholder="t.ex. project_admin" {...register("name", { required: "Namn krävs." })} />
          </Field>
          <Field label="Beskrivning">
            <TextArea rows={4} {...register("description")} />
          </Field>
        </>
      )}

      {kind === "permission" && (
        <>
          <Field label="Roll" error={errors.role as never}>
            <select className={fieldInputClass} {...register("role", { required: "Välj roll." })}>
              <option value="">Välj roll</option>
              {roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="API-operation" error={errors.api_operation as never}>
            <select className={fieldInputClass} {...register("api_operation", { required: "Välj operation." })}>
              <option value="">Välj operation</option>
              {operations.map((item) => <option key={item.id} value={item.id}>{item.method} {item.path} · {item.title}</option>)}
            </select>
          </Field>
          <Field label="Scope">
            <select className={fieldInputClass} {...register("scope")}>
              <option value="all">all</option>
              <option value="own">own</option>
              <option value="member">member</option>
            </select>
          </Field>
        </>
      )}

      <FormActions
        isSubmitting={isSubmitting}
        submitLabel={record ? "Spara ändringar" : kind === "screen" ? "Skapa skärm" : kind === "role" ? "Skapa roll" : "Skapa behörighet"}
        onCancel={() => router.push("/model/frontend")}
        size="md"
      />
    </form>
  )
}
