"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createProject, updateProject } from "@/app/actions/flux/projects"
import { listIdentities } from "@/app/actions/flux/identities"
import { fluxProjectFormSchema, type FluxProjectFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FileUpload } from "@/app/components/ui/FileUpload"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles"
import { UserMultiSelect } from "@/app/flux/user-multiselect"
import { useUser } from "@/app/lib/user-context"
import type { FluxIdentity, FluxProject } from "@/app/lib/dal"
import { useFluxProjectActions, useFluxUsers } from "@/app/flux/_state/flux-context"

export function ProjectFormDrawer({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project?: FluxProject
}) {
  const { addProject, replaceProject } = useFluxProjectActions()
  const user = useUser()
  const users = Array.from(useFluxUsers().values())
  const defaultMembers = project?.members ?? (user ? [user.id] : [])
  const uploadedFiles = useUploadedFiles(project?.files, project?.id ?? null)
  const {
    register,
    handleSubmit, reset, control, setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxProjectFormValues>({
    resolver: zodResolver(fluxProjectFormSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      members: defaultMembers,
      include_identity: project?.include_identity ?? false,
      identity: project?.identity ?? null,
    },
  })
  const members = useWatch({ control, name: "members" })
  const includeIdentity = useWatch({ control, name: "include_identity" })

  // Identities are only needed once the switch is on, so they are fetched lazily.
  const [identities, setIdentities] = useState<FluxIdentity[] | null>(null)
  useEffect(() => {
    if (!open || !includeIdentity || identities !== null) return
    let active = true
    void listIdentities().then((list) => {
      if (active) setIdentities(list)
    })
    return () => {
      active = false
    }
  }, [open, includeIdentity, identities])
  // You can only choose an identity you own; keeping the project's current one is always allowed.
  const choosableIdentities = (identities ?? []).filter(
    (identity) => identity.owner === user?.id || identity.id === project?.identity,
  )

  useEffect(() => {
    if (!open) return
    reset({
      name: project?.name ?? "",
      description: project?.description ?? "",
      members: defaultMembers,
      include_identity: project?.include_identity ?? false,
      identity: project?.identity ?? null,
    })
  }, [open, project, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = project
      ? await updateProject(project.id, data, uploadedFiles.urls)
      : await createProject(data, uploadedFiles.urls)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Projektet kunde inte sparas." })
      return
    }
    if (project) replaceProject(result.data)
    else addProject(result.data)
    onClose()
  })

  return (
    <Drawer
      title={project ? "Redigera projekt" : "Nytt projekt"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <Field label="Namn" error={errors.name}>
          <input
            type="text"
            placeholder="t.ex. Rev-C flygstyrenhet"
            className={fieldInputClass}
            {...register("name")}
          />
        </Field>

        <Field label="Beskrivning" error={errors.description}>
          <textarea
            rows={3}
            placeholder="Vad handlar projektet om"
            className={fieldInputClass}
            {...register("description")}
          />
        </Field>

        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input type="checkbox" {...register("include_identity")} />
            Inkludera visuell identitet
          </label>
          {includeIdentity && (
            <Field label="Identitet" error={errors.identity}>
              <select className={fieldInputClass} {...register("identity")}>
                <option value="">Ingen vald än</option>
                {choosableIdentities.map((identity) => (
                  <option key={identity.id} value={identity.id}>{identity.name}</option>
                ))}
              </select>
            </Field>
          )}
          {includeIdentity && identities === null && <p className="text-xs text-text-faint">Hämtar identiteter…</p>}
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Medlemmar
          <UserMultiSelect users={users} value={members} onChange={(value) => setValue("members", value, { shouldDirty: true })} />
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Filer
          <FileUpload folder="flux" files={uploadedFiles.files} onChange={uploadedFiles.setFiles} />
        </div>

        <FormRootError error={errors.root} />
        <FormActions isSubmitting={isSubmitting} submitLabel={project ? "Spara" : "Skapa projekt"} onCancel={onClose} size="md" className="flex items-center justify-end gap-2.5 pt-2" />
      </form>
    </Drawer>
  )
}
