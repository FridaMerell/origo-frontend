import { getTempusSpeciesCategoryByTaxonId, getTempusSpeciesPageByCategory } from "@/app/lib/dal"
import Link from "next/link"
import { Icon } from "@/app/components/ui/Icon"
import FollowButton from "./[id]/FollowButton"
import TaxonSearch from "./taxon-search"

const Page = async ({ params, searchParams }: {
  params: {
    label: string,
  },
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
  const { results: species, count, next, previous, pageSize = species.length || 1 } = await getTempusSpeciesPageByCategory(label, {
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
      <h1 className="font-display text-3xl font-semibold tracking-tight md:mt-5">{category?.label}</h1>

      <TaxonSearch />

      <dl className="flex-col ">
        {species.length === 0 && (
          <p className="py-4 text-sm text-text-muted">
            {search ? `Inga arter matchar "${search}".` : "Inga arter."}
          </p>
        )}
        {species.map((sp) => (
          <div  key={sp.id} className="py-2 border-b flex justify-between  border-field-border">
            <Link href={`/taxa/${label}/${sp.dyntaxa_taxon_id}`}>
              <div className="flex flex-col md:flex-row gap-4  items-baseline">
                <span className="font-display text-md capitalize">
                  {sp.swedish_name}
                </span>
                <span className="font-mono italic text-sm text-text-muted">
                  {sp.scientific_name}
                </span>
              </div>
            </Link>
            <FollowButton props={{ variant: "primary", size: 'sm' }} taxa={sp.id} initial={sp.is_followed} />
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
              <Icon name="chevron-left" size={16} />
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
              <Icon name="chevron-right" size={16} />
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
