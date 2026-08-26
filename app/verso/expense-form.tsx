"use client"

import { useActionState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createExpense, type CreateExpenseState } from "../actions/expense"
import { Button } from "../components/ui/Button"

const initialState: CreateExpenseState = undefined

const ExpenseForm = ({ venture }: { venture?: string }) => {
  const [state, formAction, pending] = useActionState(createExpense, initialState)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (state?.success) router.refresh()
  }, [state, router])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="venture" value={venture} />
      <input type="hidden" name="path" value={pathname} />

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Beskrivning
        <input
          type="text"
          name="description"
          required
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Belopp
        <input
          type="text"
          name="amount"
          required
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Datum
        <input
          type="date"
          name="date_incurred"
          required
          className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
        />
      </label>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Sparar..." : "Spara"}
        </Button>
      </div>
    </form>
  )
}

export default ExpenseForm
