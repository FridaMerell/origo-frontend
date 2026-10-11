"use client"

import { useFacilities, useVentureData } from "@/app/verso/_state/verso-context"
import { useUsers, getUserLabel } from "@/app/lib/user-context"
import { GroupedList, groupItems } from "@/app/components/ui/GroupedList"
import { Drawer } from "@/app/components/ui/Drawer"
import ExpenseForm from "@/app/verso/forms/expense-form"
import { formatDateLong } from "@/app/lib/formatters"
import type { Expense } from "@/app/lib/dal"

const groupLabel = (date: string) => formatDateLong(date)

export default function ExpensesView() {
  const { expenses, ventures } = useVentureData()
  const { yearlyExpenses } = useFacilities()
  const users = useUsers()

  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date_incurred).getTime() - new Date(a.date_incurred).getTime()
  )
  const groups = groupItems(sorted, (e) => groupLabel(e.date_incurred))

  return (
    <div className="container flex min-w-0 flex-1 flex-col gap-4 py-5 sm:py-8">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="m-0 font-display text-2xl font-semibold text-text">Utgifter</h1>
        <Drawer trigger="Ny utgift" triggerSize="sm" title="Ny utgift">
          <ExpenseForm />
        </Drawer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
        <span>{expenses.length} poster</span>
        <span>&middot;</span>
        <span>{yearlyExpenses.toLocaleString("sv-SE")} kr i år</span>
      </div>

      <GroupedList<Expense>
        groups={groups}
        emptyMessage="Inga utgifter registrerade ännu."
        getKey={(expense) => expense.id}
        getHref={(expense) => `/ekonomi/${expense.id}`}
        renderRow={(expense) => {
          const venture = ventures.find((v) => String(v.id) === String(expense.venture))
          return (
            <>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-text">{expense.description || "Utgift"}</span>
                <span className="text-xs text-text-faint">
                  {[venture?.name, getUserLabel(users, expense.user)].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold text-text">
                {expense.amount} kr
              </span>
            </>
          )
        }}
      />
    </div>
  )
}
