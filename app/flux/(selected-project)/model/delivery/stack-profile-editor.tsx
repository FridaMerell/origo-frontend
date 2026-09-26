"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Checkbox, Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import type { FluxStackProfile } from "@/app/lib/dal"
import { saveStackProfile } from "./_actions/stack-profile"

type Values = { api_naming: string; auth_method: string; database: string; app_label: string; namespace: string }
const targets = ["django", "typescript", "csharp"] as const

export function StackProfileEditor({ projectId, profile }: { projectId: string; profile?: FluxStackProfile }) {
  const router = useRouter()
  const [selectedTargets, setSelectedTargets] = useState<string[]>(profile?.targets ?? [])
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ defaultValues: { api_naming: profile?.api_naming ?? "snake_case", auth_method: profile?.auth_method ?? "session", database: profile?.database ?? "postgresql", app_label: profile?.app_label ?? "", namespace: profile?.namespace ?? "" } })
  const submit = useSubmitAction(setError)
  const toggleTarget = (target: string, checked: boolean) => setSelectedTargets((current) => checked ? [...new Set([...current, target])] : current.filter((item) => item !== target))
  const onSubmit = handleSubmit(async (values) => {
    await submit(() => saveStackProfile({ id: profile?.id, payload: { project: Number(projectId), targets: selectedTargets, api_naming: values.api_naming, auth_method: values.auth_method, database: values.database, app_label: values.app_label.trim(), namespace: values.namespace.trim() } }), () => { router.push("/model/delivery"); router.refresh() })
  })
  return <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-5"><FormRootError error={errors.root} /><section className="border-y border-border py-4"><h2 className="font-semibold text-text">Genereringstargets</h2><p className="mt-1 text-sm text-text-muted">StackProfile tillåter endast dessa tre targets. Design, integration och skeleton är separata scaffold-targets.</p><div className="mt-4 flex flex-wrap gap-5">{targets.map((target) => <Checkbox key={target} label={target} checked={selectedTargets.includes(target)} onChange={(event) => toggleTarget(target, event.target.checked)} />)}</div></section><div className="grid gap-4 sm:grid-cols-3"><Field label="API-namngivning"><select className={fieldInputClass} {...register("api_naming")}><option value="snake_case">snake_case</option><option value="camel_case">camel_case</option></select></Field><Field label="Autentisering"><select className={fieldInputClass} {...register("auth_method")}><option value="session">session</option><option value="token">token</option><option value="jwt">jwt</option><option value="none">none</option></select></Field><Field label="Databas"><select className={fieldInputClass} {...register("database")}><option value="postgresql">postgresql</option><option value="mysql">mysql</option><option value="sqlite">sqlite</option><option value="sqlserver">sqlserver</option></select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="App label"><input className={fieldInputClass} {...register("app_label")} /></Field><Field label="Namespace"><input className={fieldInputClass} {...register("namespace")} /></Field></div><FormActions isSubmitting={isSubmitting} submitLabel={profile ? "Spara stackprofil" : "Skapa stackprofil"} onCancel={() => router.push("/model/delivery")} size="md" /></form>
}
