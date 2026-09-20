import type { Metadata } from "next"
import { getDrawing, getDrawingPages, getFacilities } from "@/app/lib/dal"
import { BackLink, DetailNotFound } from "@/app/verso/ui/DetailPage"
import { PrintView } from "@/app/verso/ritningar/print/print-view"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const drawing = await getDrawing(id)

  return { title: drawing ? `Skriv ut ${drawing.name} | Ritningar` : "Skriv ut | Verso" }
}

export default async function PrintDrawingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [drawing, facilities] = await Promise.all([getDrawing(id), getFacilities()])

  if (!drawing) {
    return <DetailNotFound backHref="/ritningar" backLabel="Ritningar" message="Ritningen kunde inte hittas." />
  }

  const pages = await getDrawingPages(id)
  const houseName = facilities.find((f) => String(f.id) === String(drawing.house))?.name ?? ""

  return (
    <div className="container flex min-w-0 flex-1 flex-col gap-4 py-5 sm:py-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <BackLink href={`/ritningar/${id}`}>{drawing.name}</BackLink>
        <h1 className="m-0 font-display text-2xl font-semibold text-text">Skriv ut</h1>
      </div>
      <PrintView drawing={drawing} pages={pages} houseName={houseName} />
    </div>
  )
}
