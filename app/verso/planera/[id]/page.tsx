"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useVentureData } from "@/app/lib/venture-context"
import { useUpdateData } from "@/app/lib/update-context"
import { useUsers, getUserLabel } from "@/app/lib/user-context"
import { Card } from "@/app/components/ui/Card"
import { Icon } from "@/app/components/ui/Icon"
import { Badge } from "@/app/components/ui/Badge"
import { Drawer } from "@/app/components/ui/Drawer"
import { Gallery } from "@/app/components/ui/Gallery"
import UpdateForm from "@/app/verso/update-form"
import ExpenseForm from "@/app/verso/expense-form"
import VentureTaskForm from "@/app/verso/venture-task-form"
import { VentureEditForm } from "@/app/verso/planera/venture-edit-form"
import { VentureFilesForm } from "@/app/verso/planera/venture-files-form"
import { ToggleTaskButton } from "@/app/verso/toggle-task-button"

const PRIORITY_LABEL: Record<number, string> = {
  1: "Hög prio",
  2: "Bör göras",
  3: "Vore kul",
}

export default function VenturePage() {
  const { id } = useParams<{ id: string }>()
  const { ventures, ventureTasks, expenses } = useVentureData()
  const { updates } = useUpdateData()
  const users = useUsers()

  const venture = ventures.find((v) => String(v.id) === id)

  if (!venture) {
    return (
      <div className="flex flex-1 flex-col gap-5 p-7">
        <Link href="/planera" className="flex items-center gap-1 text-sm text-text-muted hover:text-accent">
          <Icon name="chevron-left" size={14} />
          Planering
        </Link>
        <div className="text-text-muted">Projektet kunde inte hittas.</div>
      </div>
    )
  }

  const tasks = ventureTasks.filter((t) => String(t.venture) === String(venture.id))
  const taskIds = new Set(tasks.map((t) => String(t.id)))
  const ventureUpdates = updates.filter(
    (u) => String(u.venture) === String(venture.id) || (u.task !== null && taskIds.has(String(u.task)))
  )
  const ventureExpenses = expenses.filter((e) => String(e.venture) === String(venture.id))
  const allFiles = Array.from(new Set([...venture.files, ...ventureUpdates.flatMap((u) => u.files)]))

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <Link href="/planera" className="flex items-center gap-1 text-sm text-text-muted hover:text-accent">
        <Icon name="chevron-left" size={14} />
        Planering
      </Link>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="m-0 font-display text-2xl font-semibold text-text">{venture.name}</h1>
          <Badge variant="accent">{PRIORITY_LABEL[venture.priority] ?? "Ej prio"}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Drawer trigger="Redigera" triggerVariant="ghost" triggerSize="sm" title="Redigera projekt">
            <VentureEditForm venture={venture} />
          </Drawer>
          <Drawer trigger="Ny uppdatering" triggerVariant="secondary" triggerSize="sm" title="Ny uppdatering">
            <UpdateForm defaultVenture={venture.id} />
          </Drawer>
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap text-sm text-text">{venture.description}</p>

        <hr className="border-border" />

        <div className="flex gap-6">
          {venture.budget > 0 && (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-text-faint">Budget</span>
              <span className="text-sm font-mono text-text">{venture.budget}</span>
            </div>
          )}
          {venture.total_spent > 0 && (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-text-faint">Kostnad</span>
              <span className="text-sm font-mono text-text">{venture.total_spent}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-text-faint">Delmål</span>
            <span className="text-sm font-mono text-text">
              {venture.finished_tasks_count}/{venture.total_tasks_count ?? 0}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-text-faint">Bilagor</span>
          <Drawer trigger="Lägg till filer" triggerVariant="ghost" triggerSize="sm" title="Lägg till filer">
            <VentureFilesForm venture={venture} />
          </Drawer>
        </div>
        <Gallery files={allFiles} />
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 font-display text-lg font-semibold text-text">Uppgifter</h2>
          <Drawer trigger="Ny uppgift" triggerVariant="secondary" triggerSize="sm" title="Ny uppgift">
            <VentureTaskForm venture={venture.id} />
          </Drawer>
        </div>
        {tasks.length === 0 ? (
          <div className="text-sm text-text-muted">Inga uppgifter ännu.</div>
        ) : (
          <Card className="flex flex-col gap-0 p-0">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/planera/${venture.id}/tasks/${task.id}`}
                className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-sm text-text last:border-b-0 hover:bg-surface-2"
              >
                <span className="flex items-center gap-2">
                  <Icon
                    name={task.completed ? "check-circle-2" : "circle"}
                    size={14}
                    className={task.completed ? "text-success" : "text-text-faint"}
                  />
                  {task.name}
                </span>
                <span className="flex items-center gap-3">
                  <ToggleTaskButton id={task.id} completed={task.completed} />
                  <Icon name="chevron-right" size={14} className="text-text-faint" />
                </span>
              </Link>
            ))}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 font-display text-lg font-semibold text-text">Utgifter</h2>
          <Drawer trigger="Ny utgift" triggerVariant="secondary" triggerSize="sm" title="Ny utgift">
            <ExpenseForm venture={venture.id} />
          </Drawer>
        </div>
        {ventureExpenses.length === 0 ? (
          <div className="text-sm text-text-muted">Inga utgifter ännu.</div>
        ) : (
          <Card className="flex flex-col gap-0 p-0">
            {ventureExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-sm text-text last:border-b-0"
              >
                <span>{expense.description}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono">{expense.amount}</span>
                  <span className="text-xs text-text-faint">
                    {new Date(expense.date_incurred).toLocaleDateString("sv-SE", { dateStyle: "medium" })}
                  </span>
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-lg font-semibold text-text">Uppdateringar</h2>
        {ventureUpdates.length === 0 ? (
          <div className="text-sm text-text-muted">Inga uppdateringar ännu.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {ventureUpdates.map((update) => (
              <Card key={update.id} className="flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/updates/${update.id}`}
                      className="text-sm font-semibold text-text hover:text-accent"
                    >
                      {update.title}
                    </Link>
                    {update.task && (
                      <span className="self-start">
                        <Badge variant="neutral">
                          {tasks.find((t) => String(t.id) === String(update.task))?.name ?? "Uppgift"}
                        </Badge>
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="whitespace-nowrap text-xs text-text-faint">
                      {getUserLabel(users, update.author)} ·{" "}
                      {new Date(update.created_at).toLocaleDateString("sv-SE", { dateStyle: "medium" })}
                    </span>
                    <Drawer trigger="Redigera" triggerVariant="ghost" triggerSize="sm" title="Redigera uppdatering">
                      <UpdateForm update={update} />
                    </Drawer>
                  </div>
                </div>
                <Link href={`/updates/${update.id}`}>
                  <p className="line-clamp-2 text-sm text-text-muted">{update.content}</p>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
