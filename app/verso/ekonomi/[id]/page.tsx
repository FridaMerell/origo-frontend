import type { Metadata } from "next"
import { getExpense } from "@/app/lib/dal"
import ExpenseView from "./expense-view"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const expense = await getExpense(id)

  return {
    title: expense ? `${expense.description} | Utgifter` : "Utgift | Verso",
    description: expense ? expense.description : "Utgift i Verso",
  }
}

export default function ExpensePage() {
  return <ExpenseView />
}
