"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCompareSpecies } from "./use-compare"

export const COMPARE_HREF = "/ljud/jamfor"

/**
 * A band across the full width under the top navigation, shown while species are chosen for the sound comparison. A
 * thick sienna rule over a paper surface, as under a chapter heading: the heading, the chosen species in italics, and
 * the way into the comparison page. It is not shown on that page.
 */
export default function CompareBar() {
  const { species, ready } = useCompareSpecies()
  const pathname = usePathname()

  if (!ready || species.length === 0 || pathname === COMPARE_HREF) return null

  return (
    <div className="border-y border-border border-t-[3px] border-t-accent bg-surface">
      <div className="container mx-auto flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 py-3 font-display max-sm:px-4">
        <p className="min-w-0 leading-snug">
          <span className="text-[17px] italic text-text first-letter:uppercase">
            {species.map((item, position) => (
              <span key={item.id} className="whitespace-nowrap">
                {position > 0 ? " " : null}
                {item.name}
                {position < species.length - 1 ? "," : null}
              </span>
            ))}
          </span>
        </p>
        <Link
          href={COMPARE_HREF}
          className="text-[17px] font-medium text-accent underline decoration-1 underline-offset-4 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          Jämför ljud
        </Link>
      </div>
    </div>
  )
}
