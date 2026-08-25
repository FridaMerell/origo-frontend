"use client"

import { useActionState } from "react"
import { createVentureTask, updateVentureTask, type CreateVentureTaskState } from "../actions/venture-task"
import { Button } from "../components/ui/Button"
import type { VentureTask } from "../lib/dal"

const initialState: CreateVentureTaskState = undefined

const VentureTaskForm = ({ venture, task }: { venture: string; task?: VentureTask }) => {
  const [state, formAction, pending] = useActionState(
    task ? updateVentureTask : createVentureTask,
    initialState
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {task ? (
        <input type="hidden" name="id" value={task.id} />
      ) : (
        <input type="hidden" name="venture" value={venture} />
      )}

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Namn
        <input
          type="text"
          name="name"
          required
          defaultValue={task?.name}
          className="rounded border border-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Beskrivning
        <textarea
          name="description"
          required
          defaultValue={task?.description}
          className="rounded border border-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      {task && (
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" name="completed" defaultChecked={task.completed} className="accent-accent" />
          Klar
        </label>
      )}

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Sparar..." : "Spara"}
        </Button>
      </div>
    </form>
  )
}

export default VentureTaskForm
