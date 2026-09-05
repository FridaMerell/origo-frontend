"use client"

import { ArrowUpRight, Receipt } from "lucide-react"
import { Card } from "../../components/ui/Card"
import { useFacilities } from "../_state/facility-context"
import Link from "next/link"

export function RecentExpensesWidget() {
  const { yearlyExpenses } = useFacilities()
  return (
    <Card className="col-span-1 flex h-full flex-col lg:col-span-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-text">
        <Receipt size={16} />
        Utgifter i år
      </div>

      <div className="mt-7">
        <div className="font-display text-4xl font-semibold leading-none text-text">
          {yearlyExpenses ? `${yearlyExpenses} kr` : "—"}
        </div>
        <div className="mt-2 text-sm text-text-muted">
          {yearlyExpenses ? "Registrerat för den valda anläggningen" : "Inga utgifter registrerade ännu"}
        </div>
      </div>

      <Link href="/ekonomi" className="mt-1 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-link hover:text-link-hover">
        Se ekonomin <ArrowUpRight size={15} />
      </Link>

      <div className="mt-auto flex gap-2" aria-hidden="true">
        <span className="h-1 flex-1 rounded-full bg-secondary" />
        <span className="h-1 flex-1 rounded-full bg-accent" />
        <span className="h-1 flex-1 rounded-full bg-success" />
      </div>
    </Card>
  )
}
