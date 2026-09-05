"use client"

import { useEffect, useRef, useState } from "react"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { useSpeciesPage } from "./ui/use-species-page"
import { ArrowRight, Search, X } from "lucide-react"

type SpeciesSearchProps = {
  open: boolean
  onClose: () => void
}

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("sv")
    .trim()

export default function SpeciesSearch({ open, onClose }: SpeciesSearchProps) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const { results, loading, error } = useSpeciesPage({
    search: query,
    pageSize: 25,
    enabled: open && query.trim().length >= 2,
  })
  const normalizedQuery = normalizeName(query)
  const matches = results.filter((species) =>
    normalizeName(species.swedish_name).includes(normalizedQuery),
  )

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-3 py-[max(1rem,env(safe-area-inset-top))] sm:items-center"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="species-search-title"
        className="relative flex max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 id="species-search-title" className="font-display text-xl font-semibold text-text">
              Artsök
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">Sök bland svenska artnamn.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng artsök"
            className="flex size-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-accent-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <X size={19} />
          </button>
        </div>

        <div className="border-b border-border p-4 sm:p-5">
          <label htmlFor="species-search-input" className="sr-only">Sök på svenskt artnamn</label>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              ref={inputRef}
              id="species-search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sök på svenskt artnamn"
              className="h-12 w-full rounded-md border border-field-border bg-bg py-2 pl-10 pr-3 text-text placeholder:text-text-faint focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
            />
          </div>
        </div>

        <div className="min-h-36 overflow-y-auto p-2 sm:p-3">
          {query.trim().length < 2 ? (
            <p className="px-3 py-5 text-sm text-text-muted">Skriv minst två bokstäver för att söka.</p>
          ) : loading ? (
            <p className="px-3 py-5 text-sm text-text-muted">Söker arter…</p>
          ) : error ? (
            <p className="px-3 py-5 text-sm text-danger">{error}</p>
          ) : matches.length === 0 ? (
            <p className="px-3 py-5 text-sm text-text-muted">Inga svenska artnamn matchar “{query.trim()}”.</p>
          ) : (
            <ul className="grid gap-1" aria-label="Sökresultat">
              {matches.map((species) => (
                <li key={species.id}>
                  <Link
                    href={`/taxa/oversikt/${species.dyntaxa_taxon_id}`}
                    onClick={onClose}
                    className="flex items-center justify-between gap-4 rounded-md px-3 py-3 no-underline transition-colors hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-focus-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text">{species.swedish_name}</span>
                      <span className="block truncate font-mono text-xs italic text-text-muted">{species.scientific_name}</span>
                    </span>
                    <ArrowRight size={17} className="shrink-0 text-text-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
