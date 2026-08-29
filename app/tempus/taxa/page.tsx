import Link from "next/link"
import { Drawer } from "@/app/components/ui/Drawer"
import SpeciesCategoryForm from "./species-category-form"
import { getTempusSpeciesCategories } from "@/app/lib/dal"
import { Card } from "@/app/components/ui/Card"

const Page = async () => {
  const categories = await getTempusSpeciesCategories()
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
                      `${category.species_count} ${category.species.length > 1 ? 'arter' : 'art'}`}</p>
              </Card>
            </Link>
          }
          )}
        </div>
      </section>
    </div>
  )
}

export default Page