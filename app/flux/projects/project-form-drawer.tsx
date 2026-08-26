"use client"

import { useActionState, useEffect, useMemo, useRef } from "react"
import { usePathname } from "next/navigation"
import { createProject, updateProject, type FluxActionState } from "@/app/actions/flux"
import { Button } from "@/app/components/ui/Button"
import { Drawer } from "@/app/components/ui/Drawer"
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
      title={project ? "Edit project" : "New project"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <form action={formAction} className="flex flex-col gap-4.5">
        <input type="hidden" name="path" value={pathname} />

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Name
          <input
            type="text"
            name="name"
            required
            defaultValue={project?.name}
            placeholder="e.g. Rev-C flight controller"
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Description
          <textarea
            name="description"
            rows={3}
            defaultValue={project?.description}
            placeholder="What is this project about"
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Members
          <UserMultiSelect
            name="members"
            users={users}
            defaultSelected={project?.members ?? []}
          />
        </div>

        {state?.errors?.name && (
          <p className="text-sm text-danger">
            {state.errors.name[0]}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" variant="primary" size="md" disabled={pending}>
            {pending ? "Saving..." : project ? "Save" : "Create project"}
          </Button>
        </div>
      </form>
    </Drawer>

  )
}