"use client"

import { CreditCard } from "lucide-react"
import { Card } from "../../components/ui/Card"
import { useFacilities } from "../_state/facility-context"

export function RecentExpensesWidget() {
  const { yearlyExpenses } = useFacilities()
  return yearlyExpenses ? (
    <Card className="w-full col-span-6 md:col-span-3 lg:col-span-3 gap-5 flex flex-col justify-between">
      <div className="flex flex-col gap-2">
        <span className="text-text-faint text-xs ">
          <CreditCard size={13} className="inline-block mr-1" />
          Utgifter i år
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-display font-bold">{yearlyExpenses} kr</span>
        </div>
      </div>
    </Card>
  ) : (
    <Card className="w-full col-span-6 md:col-span-3 lg:col-span-3 gap-5 flex flex-col justify-between">
      <div className="mb-5 text-text-muted">Inga utgifter.</div>
    </Card>
  )
}
