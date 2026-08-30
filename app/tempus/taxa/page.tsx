import Link from "next/link"
import { Drawer } from "@/app/components/ui/Drawer"
import SpeciesCategoryForm from "./species-category-form"
import { getTempusSpeciesCategoriesPage } from "@/app/lib/dal"
import { Card } from "@/app/components/ui/Card"

const Page = async ({ searchParams }: { searchParams: Promise<{ p?: string }> }) => {
  const { p } = await searchParams
  const page = p && Number.isInteger(Number(p)) && Number(p) > 0 ? Number(p) : 1
  const { results: categories, count, pageSize = 24 } = await getTempusSpeciesCategoriesPage({ page })
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  return (
    <div className="container py-5 mx-auto flex flex-col gap-5 ">
      <div className="w-full flex  flex-col md:flex-row justify-between items-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:mt-5">Taxonomier</h1>
        <div>
          <Drawer trigger={'Skapa kategori'} triggerSize={'md'}>
            <SpeciesCategoryForm />
          </Drawer>
        </div>

      </div>
      <section>
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-5">
          {categories.map(category => {
            return <Link key={category.id} href={`/taxa/${category.taxon_id}`} className="no-underline">
              <Card className="h-full transition-colors hover:border-border-strong">
                <h2 className="font-display font-thin text-lg">{category.label}</h2>
                <p className="text-sm font-mono uppercase text-muted-foreground">
                  {
                    category.species_count === 0 ? 'Inga arter'
                      :
                      `${category.species_count} ${category.species_count === 1 ? 'art' : 'arter'}`}</p>
              </Card>
            </Link>
          }
          )}
        </div>
      </section>
      {totalPages > 1 ? (
        <nav className="flex items-center justify-between text-sm text-text-muted" aria-label="Sidnavigering för taxonomier">
          {page > 1 ? <Link href={page === 2 ? "?" : `?p=${page - 1}`}>Föregående</Link> : <span />}
          <span>Sida {page} av {totalPages}</span>
          {page < totalPages ? <Link href={`?p=${page + 1}`}>Nästa</Link> : <span />}
        </nav>
      ) : null}
    </div>
  )
}

export default Page
