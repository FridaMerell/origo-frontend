import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTempusChecklistsPage, getTempusInterestingSpots, getTempusLocaleItem } from "@/app/lib/dal"
import { localeRepresentativePoint } from "@/app/tempus/locales"
import { InterestingSpots } from "../../home/interesting-spots"
import { LocaleAtlas } from "../locale-atlas"

const CHECKLISTS_PER_PAGE = 25

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ observationsPage?: string; checklistsPage?: string }>
}

function readPageNumber(value: string | undefined) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const locale = await getTempusLocaleItem(id)

  if (!locale) return { title: "Plats" }

  return {
    title: `${locale.name} | Karta`,
    description: `Interaktiv karta över ${locale.name}.`,
  }
}

export default async function LocaleDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const {
    observationsPage: observationsPageParam,
    checklistsPage: checklistsPageParam,
  } = await searchParams
  const locale = await getTempusLocaleItem(id)

  if (!locale) notFound()

  const observationPage = readPageNumber(observationsPageParam)
  const checklistsPageNumber = readPageNumber(checklistsPageParam)
  const representativePoint = localeRepresentativePoint(locale)

  const checklistsPagePromise = getTempusChecklistsPage({
    locale: locale.id,
    ordering: "-updated_at",
    page: checklistsPageNumber,
    page_size: CHECKLISTS_PER_PAGE,
  })
  const interestingSpotsPromise = representativePoint
    ? getTempusInterestingSpots({
        longitude: representativePoint[0],
        latitude: representativePoint[1],
      })
    : Promise.resolve(null)
  const [checklistsPage, interestingSpots] = await Promise.all([checklistsPagePromise, interestingSpotsPromise])

  return (
    <main className="container py-5 max-sm:px-4 sm:py-7">
      <Link
        href="/lokaler"
        className="inline-flex items-center px-3 py-1.5 font-display text-sm font-medium italic tracking-wide text-accent underline underline-offset-4 hover:text-accent-hover"
      >
        ← Platser
      </Link>
      <LocaleAtlas
        locale={locale}
        checklistsPage={checklistsPage}
        observationPage={observationPage}
      />
      <section className="mt-8">
        <InterestingSpots
          initialData={interestingSpots}
          label={`Intressant nära ${locale.name}`}
        />
      </section>
    </main>
  )
}
