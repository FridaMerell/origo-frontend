"use client"

import { ArrowUpRight, Receipt } from "lucide-react"
import { Card } from "../../components/ui/Card"
import { useFacilities } from "../_state/facility-context"
import Link from "next/link"

export function RecentExpensesWidget() {
  const { yearlyExpenses } = useFacilities()
  return (
    <Card className="col-span-1 flex min-h-52 flex-col justify-between bg-surface-2 p-5 lg:col-span-5">
      <div className="flex flex-col gap-5">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          <Receipt size={14} />
          Utgifter i år
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-4xl font-semibold leading-none text-text">
            {yearlyExpenses ? `${yearlyExpenses} kr` : "—"}
          </span>
          <span className="text-sm text-text-muted">
            {yearlyExpenses ? "Registrerat för den valda anläggningen" : "Inga utgifter registrerade ännu"}
          </span>
        </div>
      </div>
      <Link href="/ekonomi" className="mt-6 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-link hover:text-link-hover">
        Se ekonomin <ArrowUpRight size={15} />
      </Link>
    </Card>
  )
}
