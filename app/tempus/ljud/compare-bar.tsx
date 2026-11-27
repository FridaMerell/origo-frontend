"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCompareSpecies } from "./use-compare"

export const COMPARE_HREF = "/ljud/jamfor"

/**
 * A band under the top navigation, shown while species are chosen for the sound comparison: a fine sienna rule over a
 * paper surface, the chosen species in italics and the way into the sheet. The whole band is the link, and it is not
 * shown on the sheet itself.
 */
export default function CompareBar() {
  const { species, ready } = useCompareSpecies()
  const pathname = usePathname()

  if (!ready || species.length === 0 || pathname === COMPARE_HREF) return null

  return (
    <Link
      href={COMPARE_HREF}
      className="group block border-b border-t-2 border-border border-t-accent bg-surface font-display text-base italic leading-snug text-text no-underline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus-ring"
    >
      <span className="container mx-auto flex items-baseline justify-between gap-6 py-2.5 max-sm:px-4">
        <span className="min-w-0 first-letter:uppercase">
          {species.map((item, position) => (
            <Fragment key={item.id}>
              {position > 0 ? " " : null}
              <span className="whitespace-nowrap">
                {item.name}
                {position < species.length - 1 ? "," : null}
              </span>
            </Fragment>
          ))}
        </span>
        <span className="shrink-0 whitespace-nowrap text-accent underline-offset-4 group-hover:underline">Jämför ljud</span>
      </span>
    </Link>
  )
}
