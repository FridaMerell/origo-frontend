import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { preload } from "react-dom"
import { getTempusChecklistsPage } from "@/app/lib/dal/tempus/checklists"
import { getTempusInterestingSpots } from "@/app/lib/dal/tempus/interesting-spots"
import { getTempusLocaleItem } from "@/app/lib/dal/tempus/geo"
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

  // Marktäcket för kartan är det som tar längst tid att få fram (ca 6,6 MB från
  // backend). Hämtningen startade tidigare först när kartans JavaScript hade
  // laddats och körts; en preload i sidhuvudet låter webbläsaren börja redan
  // när HTML:en tolkas. Adressen och uppgifterna måste vara exakt de som
  // getLocaleLandCoverFetch skickar (app/lib/land-cover.ts) för att svaret ska
  // återanvändas.
  preload(`/api/tempus/geo?locale=${locale.id}&resource=locale-land-cover-fetch`, { as: "fetch", crossOrigin: "use-credentials" })

  return (
    <main className="container py-5 max-sm:px-4 sm:py-7">
      <Link
        href="/lokaler"
        className="inline-flex items-center px-3 py-1.5 font-display text-sm font-medium italic tracking-wide text-accent underline underline-offset-4 hover:text-accent-hover"
      >
        ← Platser
      </Link>
      <article className="tempus-sheet-in mt-5 border border-text bg-surface p-3 outline outline-1 -outline-offset-4 outline-text sm:p-[18px] sm:-outline-offset-6">
        <h1 className="break-words pb-3 pt-1 text-center font-display text-[clamp(1.75rem,6.5vw,3rem)] font-medium italic leading-[1.1] tracking-[.04em] text-text sm:pb-4 sm:tracking-[.08em]">
          {locale.name}
        </h1>
        <div className="sm:mx-1.5">
          <LocaleAtlas
            locale={locale}
            checklistsPage={checklistsPage}
            observationPage={observationPage}
          />
        </div>
        <div className="mt-6 sm:mx-1.5 sm:mt-8">
          <InterestingSpots
            ledger
            initialData={interestingSpots}
            label={`Intressant nära ${locale.name}`}
          />
        </div>
      </article>
    </main>
  )
}
