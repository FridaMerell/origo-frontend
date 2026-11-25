import type { Metadata } from "next"
import ExpensesView from "./expenses-view"

export const metadata: Metadata = {
  title: "Utgifter | Verso",
  description: "Registrera och följ husets utgifter.",
}

export default function Page() {
  return <ExpensesView />
}
