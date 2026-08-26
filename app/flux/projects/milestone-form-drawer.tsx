"use client"

import { useActionState, useEffect, useMemo, useRef } from "react"
import { usePathname } from "next/navigation"
import { createMilestone, updateMilestone, type FluxActionState } from "@/app/actions/flux"
import { Button } from "@/app/components/ui/Button"
import { Drawer } from "@/app/components/ui/Drawer"
import type { FluxMilestone, FluxMilestoneStatus } from "@/app/lib/dal"

const STATUS_OPTIONS: { value: FluxMilestoneStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
]

const initialState: FluxActionState = undefined

export function MilestoneFormDrawer({
  open,
  onClose,
  projectId,
  milestone,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  milestone?: FluxMilestone
}) {
  const action = useMemo(
    () => (milestone ? updateMilestone.bind(null, milestone.id) : createMilestone),
    [milestone?.id]
  )

  const [state, formAction, pending] = useActionState(action, initialState)
  const pathname = usePathname()
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
      title={milestone ? "Edit milestone" : "New milestone"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <form action={formAction} className="flex flex-col gap-4.5">
        <input type="hidden" name="path" value={pathname} />
        <input type="hidden" name="project" value={projectId} />

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Name
          <input
            type="text"
            name="title"
            required
            defaultValue={milestone?.title}
            placeholder="e.g. Beta release"
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Description
          <textarea
            name="description"
            rows={3}
            defaultValue={milestone?.description}
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Status
          <select
            name="status"
            defaultValue={milestone?.status ?? "not_started"}
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Due date
          <input
            type="date"
            name="target_date"
            defaultValue={milestone?.target_date ?? ""}
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        {state?.errors?.project && (
          <p className="text-sm text-danger">{state.errors.project[0]}</p>
        )}

        {state?.errors?.title && (
          <p className="text-sm text-danger">{state.errors.title[0]}</p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" variant="primary" size="md" disabled={pending}>
            {pending ? "Saving..." : milestone ? "Save" : "Create milestone"}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}