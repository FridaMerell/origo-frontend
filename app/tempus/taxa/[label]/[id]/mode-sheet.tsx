"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import type { TempusSpeciesExtended } from "@/app/lib/dal"
import { artfaktaOf, soundsOf } from "@/app/tempus/ljud/sound-data"
import { ArtfaktaSection, SoundsSection } from "./extended"
import { DEFAULT_COMPASS_ARTWORK } from "@/app/tempus/ui/biotope-map/compass"

type Mode = "basic" | "advanced"

const MODES: Array<[Mode, string]> = [
  ["basic", "Grunddata"],
  ["advanced", "Avancerad vy"],
]

export default function ModeSheet({
  taxonId,
  name,
  follow,
  scientificName,
  artfaktaHref,
  facts,
  map,
  basic,
  updated,
}: {
  taxonId: string
  name: string
  follow: ReactNode
  scientificName?: string
  artfaktaHref: string
  facts: ReactNode
  map: ReactNode
  basic: ReactNode
  updated: string
}) {
  const [mode, setMode] = useState<Mode>("basic")
  // The recordings and the Artfakta texts are fetched apart, so the recordings show as soon as they are
  // there instead of waiting for the slower Artfakta.
  const [extended, setExtended] = useState<TempusSpeciesExtended | null | undefined>(undefined)
  const [artfakta, setArtfakta] = useState<TempusSpeciesExtended | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const headerRuleRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  useLayoutEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const panel = panelRef.current
    if (!panel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const entrance = panel.animate(
      [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 180, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
    )
    return () => entrance.cancel()
  }, [mode, extended])

  const choose = async (next: Mode) => {
    if (next === mode) return
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const rule = headerRuleRef.current
      rule?.getAnimations().forEach((animation) => animation.cancel())
      rule?.animate(
        [{ transform: "scaleX(0)", opacity: 0.85 }, { transform: "scaleX(1)", opacity: 0 }],
        { duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      )
    }
    setMode(next)
    if (next !== "advanced" || extended !== undefined || loading) return
    setLoading(true)
    setError(null)
    // Asked for at the same time; the Artfakta texts take their own time and fill in when they arrive.
    artfaktaOf(taxonId)
      .then(setArtfakta)
      .catch((caught) => setArtfakta({ artfakta: null, artfakta_error: caught instanceof Error ? caught.message : String(caught), sounds: null, sounds_error: null }))
    try {
      setExtended(await soundsOf(taxonId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }

  const mapPanel = (
    <figure className="relative min-w-0 md:h-full" aria-label={`Biotopskiss för ${name}`}>
      <div className="relative aspect-[12/5] overflow-hidden border border-border bg-surface-2/30 md:aspect-auto md:h-full md:min-h-60 xl:min-h-72">
        {map}
        <svg aria-hidden="true" viewBox={DEFAULT_COMPASS_ARTWORK.viewBox.join(" ")} className="pointer-events-none absolute bottom-2 right-2 size-11">
          {DEFAULT_COMPASS_ARTWORK.paths.map((path, index) => (
            <path key={index} d={path.d} fill={path.fill} stroke={DEFAULT_COMPASS_ARTWORK.stroke} strokeWidth={DEFAULT_COMPASS_ARTWORK.strokeWidth} transform={path.transform} />
          ))}
        </svg>
      </div>
      <figcaption className="absolute bottom-3 left-3 text-[10px] italic text-text-muted">
        Biotopskiss · {name}
      </figcaption>
    </figure>
  )

  return (
    <article className="relative overflow-hidden rounded-card border border-border bg-surface font-display text-text shadow-card">
      <header className="px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="flex items-center justify-between border-b border-border pb-2 text-[10px] italic text-text-muted">
          <span>Artblad</span>
          <div className="flex items-center gap-4">
            <span>Senast synkad {updated}</span>
            {follow}
          </div>
        </div>

        <div className="relative border-b border-border py-2">
          <div className="flex items-baseline justify-between gap-x-3">
            <h1 className="min-w-0 break-words text-3xl font-normal capitalize sm:text-4xl">{name}</h1>
            <a href={artfaktaHref} target="_blank" rel="noreferrer" className="shrink-0 text-xs italic text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-150 hover:text-accent-hover sm:hidden">Artfakta ↗</a>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0">
            <div className="flex min-w-0 items-baseline gap-x-5">
              {scientificName ? <p className="break-words text-xs italic text-text-muted sm:text-sm">{scientificName}</p> : null}
              <a href={artfaktaHref} target="_blank" rel="noreferrer" className="hidden text-xs italic text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-150 hover:text-accent-hover sm:inline">Artfakta ↗</a>
            </div>
            <div role="tablist" aria-label="Visningsläge" className="ml-auto flex gap-4 text-xs italic sm:gap-5 sm:text-sm">
              {MODES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => void choose(value)}
                  className={`cursor-pointer underline-offset-4 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    mode === value
                      ? "text-accent underline decoration-accent"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div ref={headerRuleRef} aria-hidden="true" className={`pointer-events-none absolute -bottom-px left-0 h-px w-full origin-left bg-accent transition-[transform,opacity] duration-200 ${loading ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"}`} />
        </div>
      </header>

      <div ref={panelRef} aria-busy={loading} className="px-4 pb-6 pt-4 sm:px-6 sm:pb-7">
          <div hidden={mode !== "basic"} className="flex flex-col gap-6">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:gap-6">
              <div className="min-w-0 md:h-full">{facts}</div>
              <div className="min-w-0">{mapPanel}</div>
            </div>
            {basic}
          </div>
          {mode === "advanced" ? (
            error ? (
              <p className="text-xs italic text-text-muted">{error}</p>
            ) : loading || extended === undefined ? (
              <div role="status" aria-live="polite" className="min-h-36 border-t border-border pt-3">
                <h2 className="text-base font-medium">Bioakustik</h2>
                <p className="mt-3 text-sm italic text-text-muted">Hämtar inspelningar och artfakta…</p>
              </div>
            ) : (
              <SoundsSection
                extended={extended}
                name={name}
                artfakta={<ArtfaktaSection extended={artfakta} name={name} />}
              />
            )
          ) : null}
      </div>
    </article>
  )
}
