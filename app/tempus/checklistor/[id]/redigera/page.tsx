import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTempusChecklistItem, getTempusChecklistItems, getTempusSpeciesCategoriesPage } from "@/app/lib/dal"
import ChecklistBuilder from "../../checklist-builder"

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const checklist = await getTempusChecklistItem(id)
  return { title: checklist ? `Redigera ${checklist.name} | Checklistor` : "Redigera checklista" }
}

export default async function EditChecklistPage({ params }: PageProps) {
  const { id } = await params
  const checklist = await getTempusChecklistItem(id)
  if (!checklist) notFound()

  const [items, categoryPage] = await Promise.all([
    checklist.items ?? getTempusChecklistItems(id),
    getTempusSpeciesCategoriesPage({ page_size: 50 }),
  ])

  return (
    <ChecklistBuilder
      categories={categoryPage.results}
      checklist={{
        id: checklist.id,
        name: checklist.name,
        description: checklist.description ?? "",
        start_date: checklist.start_date,
        end_date: checklist.end_date,
        geo_area: checklist.geo_area,
        species: items.map((item) => item.species),
      }}
    />
  )
}
