"use client"

import { Button } from "@/app/components/ui/Button"
import { COMPARE_ADDED_EVENT, type CompareAdded } from "@/app/tempus/ljud/compare-dock"
import { prefetchSounds } from "@/app/tempus/ljud/sound-data"
import { inkOf, useCompareSpecies } from "@/app/tempus/ljud/use-compare"

const CompareButton = ({ id, name, scientificName }: { id: string; name: string; scientificName?: string }) => {
  const { species, has, add, remove } = useCompareSpecies()
  const added = has(id)

  return (
    <Button
      variant="paper-bordered"
      aria-pressed={added}
      onClick={(event) => {
        if (added) return remove(id)
        // The ink drop starts from this button, in the ink the species will get.
        const box = event.currentTarget.getBoundingClientRect()
        const detail: CompareAdded = { x: box.left + box.width / 2, y: box.top + box.height / 2, ink: inkOf(species.length) }
        window.dispatchEvent(new CustomEvent(COMPARE_ADDED_EVENT, { detail }))
        add({ id, name, scientificName })
        prefetchSounds(id)
      }}
      rounded="rounded-md"
      className="!h-6 whitespace-nowrap border-accent !px-1.5 !text-[11px] !text-accent hover:bg-accent-wash"
    >
      <span className="sm:hidden">{added ? "I jämförelse" : "Jämför"}</span>
      <span className="max-sm:hidden">{added ? "Ta bort ur jämförelse" : "Lägg till i jämförelse"}</span>
    </Button>
  )
}

export default CompareButton
