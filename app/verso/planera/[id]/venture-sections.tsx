"use client"

import Link from "next/link"
import { Card } from "@/app/components/ui/Card"
import { Drawer } from "@/app/components/ui/Drawer"
import { EmptyState } from "@/app/components/ui/EmptyState"
import ExpenseForm from "@/app/verso/forms/expense-form"
import VentureTaskForm from "@/app/verso/forms/venture-task-form"
import { ToggleTaskButton } from "@/app/verso/planera/toggle-task-button"
import { ventureTaskStatus, VentureTaskStatusBadge } from "@/app/verso/planera/venture-task-status"
import { SectionHeading } from "@/app/verso/ui/DetailPage"
import { formatDate } from "@/app/lib/formatters"
import type { Expense, Venture, VentureTask } from "@/app/lib/dal"
import { CheckCircle2, Circle } from "lucide-react"

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-text-faint">{label}</span>
      <span className="text-sm font-mono text-text">{value}</span>
    </div>
  )
}

export function VentureStats({ venture }: { venture: Venture }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      {venture.budget > 0 && <StatItem label="Budget" value={venture.budget} />}
      {venture.total_spent > 0 && <StatItem label="Kostnad" value={venture.total_spent} />}
      <StatItem label="Delmål" value={`${venture.finished_tasks_count}/${venture.total_tasks_count ?? 0}`} />
    </div>
  )
}

export function VentureTaskList({ venture, tasks }: { venture: Venture; tasks: VentureTask[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <SectionHeading>Uppgifter</SectionHeading>
        <Drawer trigger="Ny uppgift" triggerVariant="secondary" triggerSize="sm" title="Ny uppgift">
          <VentureTaskForm venture={venture.id} />
        </Drawer>
      </div>
      {tasks.length === 0 ? (
        <EmptyState>Inga uppgifter ännu.</EmptyState>
      ) : (
        <Card className="flex flex-col gap-0 p-0">
          {tasks.map((task) => {
            const status = ventureTaskStatus(task)
            return (
              <div
                key={task.id}
                className="flex items-stretch border-b border-border text-sm text-text last:border-b-0 hover:bg-surface-2"
              >
                <Link
                  href={`/planera/${venture.id}/tasks/${task.id}`}
                  className="flex min-h-14 min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3 no-underline sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {status === "done" ? (
                      <CheckCircle2 size={16} className="shrink-0 text-success" />
                    ) : (
                      <Circle size={16} className="shrink-0 text-text-faint" />
                    )}
                    <span className="min-w-0 truncate">{task.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center pl-6 sm:pl-0">
                    <VentureTaskStatusBadge task={task} />
                  </span>
                </Link>
                <span className="flex shrink-0 items-center border-l border-border px-3">
                  <ToggleTaskButton id={task.id} status={status} />
                </span>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}

export function VentureExpenseList({ venture, expenses }: { venture: Venture; expenses: Expense[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <SectionHeading>Utgifter</SectionHeading>
        <Drawer trigger="Ny utgift" triggerVariant="secondary" triggerSize="sm" title="Ny utgift">
          <ExpenseForm venture={venture.id} />
        </Drawer>
      </div>
      {expenses.length === 0 ? (
        <EmptyState>Inga utgifter ännu.</EmptyState>
      ) : (
        <Card className="flex flex-col gap-0 p-0">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex flex-col items-start gap-1 border-b border-border px-4 py-2.5 text-sm text-text last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0 max-w-full truncate">{expense.description}</span>
              <span className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
                <span className="font-mono">{expense.amount}</span>
                <span className="text-xs text-text-faint">{formatDate(expense.date_incurred)}</span>
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
