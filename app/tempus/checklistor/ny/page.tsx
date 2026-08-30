import type { Metadata } from "next"
import ChecklistBuilder from "../checklist-builder"
import { getTempusSpeciesCategoriesPage } from "@/app/lib/dal"

export const metadata: Metadata = {
  title: "Ny checklista | Tempus",
  description: "Skapa en artchecklista manuellt eller genom CSV-import.",
}

export default async function NewChecklistPage() {
  const { results: categories } = await getTempusSpeciesCategoriesPage({ page_size: 50 })
  return <ChecklistBuilder categories={categories} />
}
