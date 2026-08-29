import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTempusChecklistItem, getTempusChecklistItems } from "@/app/lib/dal"
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

  const items = checklist.items ?? (await getTempusChecklistItems(id))

  return (
    <ChecklistBuilder
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
