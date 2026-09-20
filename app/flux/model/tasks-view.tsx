"use client"

import { useState } from "react"
import { ListChecksIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { generateProjectTasks } from "@/app/actions/flux/design"
import { useSelectedFluxProject } from "@/app/flux/_state/flux-context"
import { useModel } from "./model-context"

export function TasksView() {
  const { projectId } = useModel()
  const { selectProject } = useSelectedFluxProject()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: number; title: string }[] | null>(null)

  const generate = async () => {
    setPending(true)
    setError(null)
    const result = await generateProjectTasks(projectId)
    setPending(false)
    if (result?.error || !result?.data) {
      setError(result?.error ?? "Uppgifterna kunde inte skapas.")
      return
    }
    setCreated(result.data.created)
    // Flux keeps tasks in client state; re-selecting the project reloads its board so the
    // new tasks show up in the task lists without a full page reload.
    await selectProject(String(projectId))
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        Skapar standarduppgifter per entitet, resurs, roll och skärm. Uppgifter som redan finns skapas inte igen, så du kan köra det flera gånger när modellen växer.
      </p>
      <div>
        <Button variant="primary" size="md" disabled={pending} onClick={generate}>
          <ListChecksIcon size={16} />
          {pending ? "Skapar…" : "Generera uppgifter"}
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {created && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-faint">
            {created.length === 0 ? "Inga nya uppgifter behövdes" : `${created.length} uppgifter skapades`}
          </h3>
          {created.length > 0 && (
            <>
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {created.map((task) => (
                  <li key={task.id} className="px-4 py-2.5 text-sm text-text">{task.title}</li>
                ))}
              </ul>
              <Link href="/tasks" className="text-sm underline">Gå till uppgifter</Link>
            </>
          )}
        </section>
      )}
    </div>
  )
}
