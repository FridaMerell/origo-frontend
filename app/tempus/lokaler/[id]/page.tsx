import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTempusChecklistsPage, getTempusLocaleItem } from "@/app/lib/dal"
import { LocaleAtlas } from "../locale-atlas"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ observationsPage?: string; checklistsPage?: string }>
}

function pageNumber(value: string | undefined) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const locale = await getTempusLocaleItem(id)
  return locale ? { title: `${locale.name} | Karta`, description: `Interaktiv karta över ${locale.name}.` } : { title: "Plats" }
}

export default async function LocaleDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { observationsPage: observationsPageParam, checklistsPage: checklistsPageParam } = await searchParams
  const locale = await getTempusLocaleItem(id)
  if (!locale) notFound()

  const checklistsPage = await getTempusChecklistsPage({ locale: locale.id, ordering: "-updated_at", page: pageNumber(checklistsPageParam), page_size: 25 })

  return (
    <main className="container py-5 max-sm:px-4 sm:py-7">
      <Link href="/lokaler" className="inline-flex items-center px-3 py-1.5 font-display text-sm font-medium italic tracking-wide text-accent underline underline-offset-4 hover:text-accent-hover">
        ← Platser
      </Link>
      <LocaleAtlas
        locale={locale}
        checklistsPage={checklistsPage}
        observationPage={pageNumber(observationsPageParam)}
        checklistPage={pageNumber(checklistsPageParam)}
      />
    </main>
  )
}
