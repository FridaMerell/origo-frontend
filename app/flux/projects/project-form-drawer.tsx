"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { createProject, updateProject, type FluxActionState } from "@/app/actions/flux"
import { Button } from "@/app/components/ui/Button"
import { Drawer } from "@/app/components/ui/Drawer"
import { FileUpload, type UploadedFile } from "@/app/components/ui/FileUpload"
import { UserMultiSelect } from "@/app/flux/user-multiselect"
import { useUsers } from "@/app/lib/user-context"
import type { FluxProject } from "@/app/lib/dal"

const initialState: FluxActionState = undefined

export function ProjectFormDrawer({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project?: FluxProject
}) {
  const action = useMemo(
    () => (project ? updateProject.bind(null, project.id) : createProject),
    [project?.id]
  )

  const [state, formAction, pending] = useActionState(action, initialState)
  const pathname = usePathname()
  const users = useUsers()
  const [files, setFiles] = useState<UploadedFile[]>(
    (project?.files ?? []).map((url) => ({ url, name: url.split("/").pop() ?? url }))
  )
  const previousSuccess = useRef(false)

  useEffect(() => {
    const isSuccess = !!state?.success

    if (isSuccess && !previousSuccess.current) {
      onClose()
    }

    previousSuccess.current = isSuccess

  }, [state?.success, onClose])

  return (
    <Drawer
      title={project ? "Redigera projekt" : "Nytt projekt"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <form action={formAction} className="flex flex-col gap-4.5">
        <input type="hidden" name="path" value={pathname} />

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Namn
          <input
            type="text"
            name="name"
            required
            defaultValue={project?.name}
            placeholder="t.ex. Rev-C flygstyrenhet"
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Beskrivning
          <textarea
            name="description"
            rows={3}
            defaultValue={project?.description}
            placeholder="Vad handlar projektet om"
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Medlemmar
          <UserMultiSelect
            name="members"
            users={users}
            defaultSelected={project?.members ?? []}
          />
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Filer
          <input type="hidden" name="files_field" value="1" />
          <FileUpload folder="flux" files={files} onChange={setFiles} />
          {files.map((file) => (
            <input key={file.url} type="hidden" name="files" value={file.url} />
          ))}
        </div>

        {state?.errors?.name && (
          <p className="text-sm text-danger">
            {state.errors.name[0]}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Avbryt
          </Button>

          <Button type="submit" variant="primary" size="md" disabled={pending}>
            {pending ? "Sparar..." : project ? "Spara" : "Skapa projekt"}
          </Button>
        </div>
      </form>
    </Drawer>

  )
}