import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/app/lib/dal/auth"
import { getTempusYearSummary } from "@/app/lib/dal/tempus/observations"
import { YearSummary } from "./year-summary"

type PageProps = { params: Promise<{ year: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params
  return { title: `${year} | Tempus`, description: `Ditt år ${year} i Tempus.` }
}

export default async function YearSummaryPage({ params }: PageProps) {
  const { year } = await params
  if (!/^\d{4}$/.test(year)) notFound()
  if (!(await getCurrentUser())) redirect("/login")

  const summary = await getTempusYearSummary(Number(year))
  if (!summary) {
    return (
      <div className="container mx-auto py-16 text-center max-sm:px-4">
        <p className="font-display text-xl italic">Årssammanfattningen kunde inte hämtas.</p>
        <p className="mt-2 text-sm text-text-muted">Ladda om sidan om en stund.</p>
      </div>
    )
  }
  return <YearSummary summary={summary} />
}
