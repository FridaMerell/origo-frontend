"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Button, LinkButton } from "@/app/components/ui/Button"
import { Drawer, useDrawerClose } from "@/app/components/ui/Drawer"
import { inkOf, MIN_COMPARE, useCompareSpecies } from "./use-compare"

export const COMPARE_HREF = "/ljud/jamfor"

function CompareList() {
  const { species, remove } = useCompareSpecies()
  const close = useDrawerClose()

  return (
    <div className="flex flex-col gap-4">
      <ul className="border-y border-border">
        {species.map((item, position) => (
          <li key={item.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-3 last:border-b-0">
            <span className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="h-0.5 w-5 shrink-0" style={{ backgroundColor: `var(${inkOf(position)})` }} />
              <span className="min-w-0">
                <span className="block text-sm capitalize">{item.name}</span>
                {item.scientificName ? <span className="block truncate font-mono text-[11px] text-text-muted">{item.scientificName}</span> : null}
              </span>
            </span>
            <button type="button" onClick={() => remove(item.id)} className="text-sm text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
              Ta bort
            </button>
          </li>
        ))}
      </ul>
      <LinkButton href={COMPARE_HREF} variant="primary" onClick={close} className="justify-center">
        {species.length < MIN_COMPARE ? "Öppna jämförelsen" : "Jämför ljud"}
      </LinkButton>
    </div>
  )
}

/** Sent when a species is added: where the button that added it is, and the ink the species gets. */
export const COMPARE_ADDED_EVENT = "tempus:compare-added"
export type CompareAdded = { x: number; y: number; ink: string }

/**
 * The floating compare button: Tempus' `paper-bordered` button with the word and the number in one face, cut in the
 * shape of a leaf (two opposite corners rounded, two sharp) that turns over when you point at it. When a species is
 * added, a drop of its ink flies from the button that added it into this one, and the number rolls over. It opens the
 * list, and the list leads on to the comparison.
 */
export default function CompareDock() {
  const { species } = useCompareSpecies()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const count = useRef<HTMLSpanElement>(null)
  const previous = useRef(species.length)

  // The drop of ink: out of the button that added the species, in an arc, down into this button.
  useEffect(() => {
    const onAdded = (event: Event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      const scope = document.querySelector('[data-theme="tempus"]')
      if (!scope) return
      const { x, y, ink } = (event as CustomEvent<CompareAdded>).detail
      const target = document.querySelector("[data-compare-dock]")?.getBoundingClientRect()
      const toX = target ? target.left + target.width / 2 : window.innerWidth - 72
      const toY = target ? target.top + target.height / 2 : window.innerHeight - 44
      const drop = document.createElement("span")
      drop.setAttribute("aria-hidden", "true")
      Object.assign(drop.style, {
        position: "fixed", left: "0", top: "0", zIndex: "100", width: "12px", height: "12px",
        borderRadius: "9999px", pointerEvents: "none", backgroundColor: `var(${ink})`,
      })
      scope.appendChild(drop)
      const arc = drop.animate(
        [
          { transform: `translate(${x - 6}px, ${y - 6}px) scale(1)`, opacity: 1 },
          { transform: `translate(${(x + toX) / 2 - 6}px, ${Math.min(y, toY) - 72}px) scale(1.2)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${toX - 6}px, ${toY - 6}px) scale(0.35)`, opacity: 0.85 },
        ],
        { duration: 600, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      )
      arc.onfinish = () => drop.remove()
      arc.oncancel = () => drop.remove()
    }
    window.addEventListener(COMPARE_ADDED_EVENT, onAdded)
    return () => window.removeEventListener(COMPARE_ADDED_EVENT, onAdded)
  }, [])

  // The number rolls up when it changes.
  useEffect(() => {
    if (previous.current !== species.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      count.current?.animate(
        [{ transform: "translateY(70%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
        { duration: 260, delay: 480, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "backwards" },
      )
    }
    previous.current = species.length
  }, [species.length])

  if (species.length === 0 || pathname === COMPARE_HREF) return null

  return (
    <>
      <Button
        data-compare-dock=""
        variant="paper-bordered"
        rounded="rounded-md"
        aria-label={`Jämförelse, ${species.length} ${species.length === 1 ? "art" : "arter"} valda`}
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 h-auto flex-col items-start gap-1 border-accent bg-surface px-4 py-2 hover:bg-accent-wash sm:bottom-6"
      >
        <span className="flex items-baseline gap-2.5 text-lg leading-none">
          Jämför
          <span ref={count} className="inline-block tabular-nums">{species.length}</span>
        </span>
        {/* Under the word: the first species chosen, so the button says what is in it. */}
        <span className="max-w-44 truncate text-[13px] font-normal leading-none text-text-muted">
          {species[0]?.name}{species.length > 1 ? " m.fl." : ""}
        </span>
      </Button>
      <Drawer open={open} onOpenChange={setOpen} title="Jämförelse">
        <CompareList />
      </Drawer>
    </>
  )
}
