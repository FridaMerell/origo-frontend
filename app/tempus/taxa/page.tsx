import Link from "next/link"
import { Drawer } from "@/app/components/ui/Drawer"
import SpeciesCategoryForm from "./species-category-form"
import { getTempusSpeciesCategoriesAll } from "@/app/lib/dal"
import { Card } from "@/app/components/ui/Card"

const Page = async () => {
  const categories = await getTempusSpeciesCategoriesAll()
  const isPrimaryCategory = (category: (typeof categories)[number]) =>
    category.is_primary
  const primaryCategories = categories
    .filter(isPrimaryCategory)
    .sort((a, b) =>
      Number(b.species_count) - Number(a.species_count) ||
      a.label.localeCompare(b.label, "sv")
    )
  const secondaryCategories = categories
    .filter((category) => !isPrimaryCategory(category))
    .sort((a, b) =>
      Number(b.species_count) - Number(a.species_count) ||
      a.label.localeCompare(b.label, "sv")
    )

  const categoryLabel = (count: number) =>
    count === 0 ? "Inga arter" : `${count} ${count === 1 ? "art" : "arter"}`

  return (
    <div className="container mx-auto flex flex-col gap-6 py-5">
      <div className="flex w-full flex-col items-center justify-between gap-4 md:flex-row">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:mt-5">Taxonomier</h1>
        <div>
          <Drawer trigger="Skapa kategori" triggerVariant={'paper-bordered'} triggerSize="md">
            <SpeciesCategoryForm />
          </Drawer>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Primära kategorier</h2>
          <span className="font-mono text-xs uppercase tracking-wide text-text-faint">
            {primaryCategories.length} st
          </span>
        </div>

        {primaryCategories.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {primaryCategories.map((category) => {
              const body = (
                <Card className="h-full overflow-hidden p-0 transition-colors group-hover:border-border-strong">
                  <div className="flex h-full flex-col">
                    {category.image_url ? (
                      <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-surface-2">
                        <img
                          src={category.image_url}
                          alt={category.label}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-surface/85 via-surface/15 to-transparent" />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] items-end border-b border-border bg-linear-to-br from-surface-2 via-surface to-accent-wash/30 p-4">
                        <div className="max-w-[75%]">
                          <h3 className="mt-1 font-display  text-xl 2xl:text-2xl font-semibold italic tracking-wide">
                            {category.label}
                          </h3>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between gap-2 p-4.5">
                      <div className="flex items-start justify-between gap-3">
                       
                      </div>
                      <p className="text-sm font-mono uppercase text-text-muted">
                        {categoryLabel(category.species_count)}
                      </p>
                    </div>
                  </div>
                </Card>
              )
              return (
                category.taxon_id ? (
                  <Link
                    key={category.id}
                    href={`/taxa/${category.taxon_id}`}
                    className="group no-underline"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={category.id}>{body}</div>
                )
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-text-muted">Inga primära kategorier ännu.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Övriga kategorier</h2>
          <span className="font-mono text-xs uppercase tracking-wide text-text-faint">
            {secondaryCategories.length} st
          </span>
        </div>

        {secondaryCategories.length > 0 ? (
          <div className="grid gap-0 overflow-hidden border border-border">
            {secondaryCategories.map((category) => {
              return category.taxon_id ? (
                <Link
                  key={category.id}
                  href={`/taxa/${category.taxon_id}`}
                  className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] border-b border-border bg-surface no-underline transition-colors last:border-b-0 hover:bg-surface-2/40"
                >
                  <span className="flex min-w-0 items-center px-3 py-2 text-sm italic tracking-wide text-text">
                    <span className="truncate">{category.label}</span>
                  </span>
                  <span className="flex items-center justify-end px-3 py-2 text-xs italic tabular-nums text-text-muted">
                    {categoryLabel(category.species_count)}
                  </span>
                </Link>
              ) : (
                <div
                  key={category.id}
                  className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] border-b border-border bg-surface last:border-b-0"
                >
                  <span className="flex min-w-0 items-center px-3 py-2 text-sm italic tracking-wide text-text">
                    <span className="truncate">{category.label}</span>
                  </span>
                  <span className="flex items-center justify-end px-3 py-2 text-xs italic tabular-nums text-text-muted">
                    {categoryLabel(category.species_count)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-text-muted">Inga övriga kategorier.</p>
        )}
      </section>
    </div>
  )
}

export default Page
