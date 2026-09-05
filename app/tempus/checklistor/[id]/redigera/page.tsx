import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTempusChecklistItem, getTempusChecklistRegisterPage } from "@/app/lib/dal"
import ChecklistEditor from "./checklist-editor"

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

  const firstRegisterPage = await getTempusChecklistRegisterPage(id, { page: 1, page_size: 250 })
  const pageCount = Math.max(1, Math.ceil(firstRegisterPage.count / 250))
  const remainingRegisterPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      getTempusChecklistRegisterPage(id, { page: index + 2, page_size: 250 }),
    ),
  )
  const registerRows = [firstRegisterPage, ...remainingRegisterPages].flatMap((page) => page.results)

  return (
    <ChecklistEditor
      checklist={{
        id: checklist.id,
        name: checklist.name,
        description: checklist.description ?? "",
        auto_add: checklist.auto_add,
        start_date: checklist.start_date,
        end_date: checklist.end_date,
        geo_area: checklist.geo_area,
        nextSequence: registerRows.reduce((highest, row) => Math.max(highest, row.sequence), 0) + 1,
        species: registerRows.map((row) => ({
          id: row.species_id,
          itemId: row.id,
          name: row.swedish_name || row.scientific_name || "Okänd art",
          sequence: row.sequence,
        })),
      }}
    />
  )
}
