import type { Metadata } from "next"
import Link from "next/link"
import { Printer } from "lucide-react"
import { getDrawing, getDrawingPages } from "@/app/lib/dal"
import { BackLink, DetailNotFound } from "@/app/verso/ui/DetailPage"
import { DrawingEditor } from "@/app/verso/ritningar/editor/drawing-editor"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const drawing = await getDrawing(id)

  return {
    title: drawing ? `${drawing.name} | Ritningar` : "Ritning | Verso",
    description: drawing?.description || "Ritning i Verso",
  }
}

export default async function DrawingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const drawing = await getDrawing(id)

  if (!drawing) {
    return <DetailNotFound backHref="/ritningar" backLabel="Ritningar" message="Ritningen kunde inte hittas." />
  }

  const pages = await getDrawingPages(id)

  return (
    <div className="container flex min-w-0 flex-1 flex-col gap-3 py-5 sm:py-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <BackLink href="/ritningar">Ritningar</BackLink>
        <h1 className="m-0 font-display text-2xl font-semibold text-text">{drawing.name}</h1>
        <Link
          href={`/ritningar/${id}/skriv-ut`}
          className="ml-auto flex items-center gap-1.5 text-sm text-text-muted hover:text-accent"
        >
          <Printer size={14} />
          Skriv ut
        </Link>
      </div>
      <DrawingEditor drawing={drawing} pages={pages} />
    </div>
  )
}
