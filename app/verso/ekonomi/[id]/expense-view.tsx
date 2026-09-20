"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useVentureData } from "@/app/verso/_state/verso-context"
import { useUsers, getUserLabel } from "@/app/lib/user-context"
import { Card } from "@/app/components/ui/Card"
import { BackLink, DetailNotFound } from "@/app/verso/ui/DetailPage"
import { formatDate } from "@/app/lib/formatters"

export default function ExpenseView() {
  const { id } = useParams<{ id: string }>()
  const { expenses, ventures } = useVentureData()
  const users = useUsers()

  const expense = expenses.find((e) => String(e.id) === id)

  if (!expense) {
    return <DetailNotFound backHref="/ekonomi" backLabel="Utgifter" message="Utgiften kunde inte hittas." />
  }

  const linkedVenture = expense.venture
    ? ventures.find((v) => String(v.id) === String(expense.venture))
    : null

  return (
    <div className="flex flex-1 flex-col gap-6 p-7">
      <BackLink href="/ekonomi">Utgifter</BackLink>

      <Card className="flex flex-col gap-1">
        <span className="text-sm text-text-muted">{expense.description || "Utgift"}</span>
        <span className="font-mono text-3xl font-semibold text-text">{expense.amount} kr</span>
      </Card>

      <Card className="flex flex-col divide-y divide-border p-0 text-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-text-faint">Datum</span>
          <span className="text-text">{formatDate(expense.date_incurred)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-text-faint">Lagd av</span>
          <span className="text-text">{getUserLabel(users, expense.user)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-text-faint">Projekt</span>
          {linkedVenture ? (
            <Link href={`/planera/${linkedVenture.id}`} className="text-text hover:text-accent">
              {linkedVenture.name}
            </Link>
          ) : (
            <span className="text-text-faint">Ingen koppling</span>
          )}
        </div>
      </Card>
    </div>
  )
}
