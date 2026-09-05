"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createProject, updateProject } from "@/app/actions/flux/projects"
import { fluxProjectFormSchema, type FluxProjectFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FileUpload } from "@/app/components/ui/FileUpload"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles"
import { UserMultiSelect } from "@/app/flux/user-multiselect"
import { useUser, useUsers } from "@/app/lib/user-context"
import type { FluxProject } from "@/app/lib/dal"

export function ProjectFormDrawer({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project?: FluxProject
}) {
  const pathname = usePathname()
  const user = useUser()
  const users = useUsers()
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
    },
  })
  const submit = useSubmitAction(setError)
  const members = useWatch({ control, name: "members" })

  useEffect(() => {
    if (!open) return
    reset({
      name: project?.name ?? "",
      description: project?.description ?? "",
      members: defaultMembers,
    })
  }, [open, project, reset])

  const onSubmit = handleSubmit((data) =>
    submit(
      () =>
        project
          ? updateProject(project.id, data, uploadedFiles.urls, pathname)
          : createProject(data, uploadedFiles.urls, pathname),
      onClose
    )
  )

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
