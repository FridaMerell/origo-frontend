import { getTempusSpeciesCategoryByTaxonId, getTempusSpeciesPageByCategory } from "@/app/lib/dal"
import Link from "next/link"
import FollowButton from "./[id]/FollowButton"
import TaxonSearch from "./taxon-search"
import ImportSpeciesChecklistForm from "../import-species-checklist-form"
import { ChevronLeft, ChevronRight } from "lucide-react"

const Page = async ({ params, searchParams }: {
  params: Promise<{
    label: string,
  }>,
  searchParams: Promise<{
    [key: string]: string | string[] | undefined
  }>
}) => {
  const { label } = await params
  const { s, p } = await searchParams

  if (!parseInt(label)) {
    return <div>Ogiltig taxa.</div>
  }
  const search = typeof s === "string" && s.trim() ? s.trim() : undefined
  const page = typeof p === "string" && parseInt(p) > 0 ? parseInt(p) : 1

  const category = await getTempusSpeciesCategoryByTaxonId(label)
  const { results: species, count, next, previous, pageSize = 25 } = await getTempusSpeciesPageByCategory(label, {
    search,
    page,
  })

  if (!category) {
    return <div>Taxa hittades inte.</div>
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize))

  const hrefFor = (targetPage: number) => {
    const query = new URLSearchParams()
    if (search) query.set("s", search)
    if (targetPage > 1) query.set("p", String(targetPage))
    const qs = query.toString()
    return qs ? `?${qs}` : "?"
  }

  return (
    <div className="container py-5 mx-auto flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 md:mt-5">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{category?.label}</h1>
        <a
          href={`https://artfakta.se/taxa/${category.taxon_id}/information`}
          target="_blank"
          rel="noreferrer"
          className="font-display text-sm italic text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent-hover"
        >
          Visa artfakta
        </a>
      </div>

      <TaxonSearch />

      <ImportSpeciesChecklistForm
        categoryId={category.id}
        categoryLabel={category.label}
      />

      <dl className="flex-col ">
        {species.length === 0 && (
          <p className="py-4 text-sm text-text-muted">
            {search ? `Inga arter matchar "${search}".` : "Inga arter."}
          </p>
        )}
        {species.map((sp) => (
          <div key={sp.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-field-border py-2">
            <Link href={`/taxa/${label}/${sp.dyntaxa_taxon_id}`} className="min-w-0">
              <div className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-4">
                <span className="font-display text-md capitalize">
                  {sp.swedish_name}
                </span>
                <span className="min-w-0 truncate font-mono text-sm italic text-text-muted">
                  {sp.scientific_name}
                </span>
              </div>
            </Link>
            <FollowButton props={{ variant: "primary", size: 'sm' }} taxa={String(sp.dyntaxa_taxon_id)} initial={sp.is_followed} />
          </div>
        ))}
      </dl>

      {(next || previous) && (
        <nav className="flex items-center justify-between" aria-label="Sidnavigering">
          {previous ? (
            <Link
              href={hrefFor(page - 1)}
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
            >
              <ChevronLeft size={16} />
              Föregående
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-xs uppercase text-text-faint">
            Sida {page} av {totalPages}
          </span>
          {next ? (
            <Link
              href={hrefFor(page + 1)}
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
            >
              Nästa
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}

export default Page
