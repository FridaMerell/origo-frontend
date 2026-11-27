"use client"

import { Button } from "@/app/components/ui/Button"
import { COMPARE_ADDED_EVENT, type CompareAdded } from "@/app/tempus/ljud/compare-dock"
import { prefetchSounds } from "@/app/tempus/ljud/sound-data"
import { inkOf, useCompareSpecies } from "@/app/tempus/ljud/use-compare"

const CompareButton = ({ id, name, scientificName, className = "!h-6 !px-1.5 !text-[11px]" }: {
  id: string
  name: string
  scientificName?: string
  /** The size of the button where it stands; the default is the species sheet's small header button. */
  className?: string
}) => {
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
      className={`whitespace-nowrap border-accent !text-accent hover:bg-accent-wash ${className}`}
    >
{added ? "Ta bort" : "Jämför ljud"}
    </Button>
  )
}

export default CompareButton
