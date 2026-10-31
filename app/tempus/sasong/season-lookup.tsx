"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { Pager } from "@/app/components/ui/Pager"
import { useToast } from "@/app/components/ui/ToastProvider"
import type { TempusSeasonalOverview } from "@/app/lib/dal"
import { createChecklist } from "@/app/tempus/_actions/checklists"
import {
  followSpecies,
  loadSeasonLookup,
  unfollowSpecies,
  type SeasonFilter,
  type SeasonLookupResult,
} from "@/app/tempus/_actions/species"
import { useTempusGeoAreas } from "@/app/tempus/_state/tempus-context"
import { CsvImport } from "../checklistor/checklist-builder/csv-import"
import { TextField } from "../forms/Fields"
import { speciesHref, speciesName, STATUS_META } from "../home/season-helpers"
import { PhenoStrip } from "../home/species-register"

const PAGE_SIZE = 50
const COLUMNS = "grid grid-cols-1 gap-x-8 gap-y-1.5 px-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_18rem] md:items-center"
const SAVE_COLUMN = "w-24 shrink-0"

const EMPTY_TEXT: Record<SeasonFilter, string> = {
  all: "Inga arter i listan har ett fenogram.",
  in_season: "Inga arter i listan är i säsong just nu.",
  at_peak: "Inga arter i listan har toppsäsong just nu.",
  out_of_season: "Alla arter i listan är i säsong just nu.",
}

export default function SeasonLookup() {
  const { selectedGeoArea } = useTempusGeoAreas()
  const geoAreaId = selectedGeoArea?.id ?? null
  const router = useRouter()
  const [values, setValues] = useState<string[] | null>(null)
  const [season, setSeason] = useState<SeasonFilter>("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<SeasonLookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [saving, startSaving] = useTransition()
  const [followPending, setFollowPending] = useState<Set<string>>(() => new Set())
  const { toast } = useToast()
  // Only the latest request may fill the list, whatever order the answers arrive in.
  const latestRequest = useRef(0)
  const appliedSearch = useRef("")

  const load = async (nextValues: string[], nextSeason: SeasonFilter, nextPage: number) => {
    const request = ++latestRequest.current
    setLoading(true)
    setError(null)
    try {
      const { data, error: loadError } = await loadSeasonLookup({
        values: nextValues,
        geoAreaId,
        season: nextSeason,
        search: appliedSearch.current,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      if (request !== latestRequest.current) return null
      if (!data) throw new Error(loadError ?? "Artlistan kunde inte läsas.")
      setResult(data)
      return data
    } finally {
      if (request === latestRequest.current) setLoading(false)
    }
  }

  const reload = (nextValues: string[], nextSeason: SeasonFilter, nextPage: number) => {
    load(nextValues, nextSeason, nextPage).catch((caught: Error) => setError(caught.message))
  }

  // The curves depend on the area chosen in the menu.
  useEffect(() => {
    if (!values) return
    setPage(1)
    reload(values, season, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoAreaId])

  useEffect(() => {
    const search = query.trim()
    if (!values || search === appliedSearch.current) return
    const timer = setTimeout(() => {
      appliedSearch.current = search
      setPage(1)
      reload(values, season, 1)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, season])

  // A failure here reaches CsvImport, which reports it through onError.
  const importValues = async (nextValues: string[]) => {
    setValues(nextValues)
    setSeason("all")
    setQuery("")
    appliedSearch.current = ""
    setPage(1)
    const data = await load(nextValues, "all", 1)
    return { matched: data?.species_ids.length ?? 0, unmatched: data?.unmatched ?? [] }
  }

  const chooseSeason = (nextSeason: SeasonFilter) => {
    if (!values) return
    setSeason(nextSeason)
    setPage(1)
    reload(values, nextSeason, 1)
  }

  const choosePage = (nextPage: number) => {
    if (!values) return
    setPage(nextPage)
    reload(values, season, nextPage)
  }

  const toggleFollow = async (species: TempusSeasonalOverview) => {
    const next = !species.is_followed
    const taxon = String(species.dyntaxa_taxon_id)
    setFollowPending((current) => new Set(current).add(species.id))
    try {
      const followResult = next ? await followSpecies(taxon) : await unfollowSpecies(taxon)
      if (!followResult.ok) throw new Error(followResult.error ?? "Något gick fel. Försök igen.")
      setResult((current) => current && {
        ...current,
        results: current.results.map((row) => row.id === species.id ? { ...row, is_followed: next } : row),
      })
    } catch (caught) {
      toast({
        title: "Kunde inte ändra sparningen",
        description: caught instanceof Error ? caught.message : "Kunde inte kontakta servern. Försök igen.",
        variant: "error",
      })
    } finally {
      setFollowPending((current) => {
        const remaining = new Set(current)
        remaining.delete(species.id)
        return remaining
      })
    }
  }

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!result) return
    setError(null)
    startSaving(async () => {
      const created = await createChecklist({
        name: name.trim(),
        description: "",
        auto_add: false,
        start_date: null,
        end_date: null,
        geo_area: geoAreaId,
        locale: null,
        species: result.species_ids,
        species_category_ids: [],
      })
      if (created.checklistId) router.push(`/checklistor/${created.checklistId}`)
      else setError(created.error ?? "Checklistan kunde inte skapas.")
    })
  }

  const filters: { value: SeasonFilter; label: string; count: number }[] = result
    ? [
        { value: "all", label: "Alla", count: result.in_season_count + result.out_of_season_count },
        { value: "in_season", label: "I säsong", count: result.in_season_count },
        { value: "at_peak", label: "Toppsäsong", count: result.at_peak_count },
        { value: "out_of_season", label: "Ur säsong", count: result.out_of_season_count },
      ]
    : []
  const currentMonth = new Date().getMonth()

  return (
    <div className="mt-4 flex flex-col gap-5">
      <section className="border-x border-t border-border">
        <CsvImport
          onValues={importValues}
          maxMegabytes={20}
          messages={{ onError: setError, onClearMessages: () => setError(null) }}
        />
      </section>

      {error ? <p className="border-y border-danger py-2 text-sm text-danger" role="alert">{error}</p> : null}

      {result ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {filters.map(({ value, label, count }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={season === value}
                  onClick={() => chooseSeason(value)}
                  className={`border px-2.5 py-1 font-display italic ${
                    season === value
                      ? "border-accent bg-accent text-accent-contrast"
                      : "border-border text-text-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            <form onSubmit={save} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <TextField
                aria-label="Checklistans namn"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Checklistans namn"
                className="min-w-0 flex-1 sm:w-64"
              />
              <Button
                type="submit"
                variant="paper-bordered"
                rounded="rounded-none"
                className="text-sm"
                disabled={saving || !name.trim() || result.species_ids.length === 0}
              >
                {saving ? "Sparar…" : `Spara som checklista (${result.species_ids.length})`}
              </Button>
            </form>
          </div>

          <TextField
            type="search"
            aria-label="Sök i artlistan"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Namn eller Dyntaxa-ID"
          />

          <div aria-busy={loading} className={`border border-border ${loading ? "opacity-60" : ""}`}>
            <div className="flex border-b border-border py-2.5 text-sm text-text-muted max-md:hidden">
              <div className={`min-w-0 flex-1 ${COLUMNS}`}>
                <span>Art</span>
                <span>Vetenskapligt namn</span>
                <span>Status</span>
                <span>Fenogram</span>
              </div>
              <span className={SAVE_COLUMN} />
            </div>
            {result.results.length > 0 ? (
              <ol>
                {result.results.map((species) => {
                  const status = STATUS_META[species.seasonal_status.status]
                  return (
                    <li key={species.id} className="flex flex-col border-b border-border transition-colors last:border-b-0 hover:bg-surface-2/40 md:flex-row md:items-center">
                      <Link
                        href={speciesHref(species, "all")}
                        target="_blank"
                        rel="noopener"
                        className={`group/row min-w-0 flex-1 py-3 no-underline ${COLUMNS}`}
                      >
                        <span className="min-w-0 truncate font-display text-base text-text group-hover/row:text-accent">
                          {speciesName(species)}
                        </span>
                        <span className="min-w-0 truncate font-mono text-[11px] italic text-text-muted">
                          {species.swedish_name ? species.scientific_name : null}
                        </span>
                        <span className={`text-sm ${status.ink}`}>{status.label}</span>
                        <PhenoStrip species={species} currentMonth={currentMonth} />
                      </Link>
                      <div className={`${SAVE_COLUMN} max-md:px-4 max-md:pb-3`}>
                        <Button
                          type="button"
                          variant="paper-bordered"
                          rounded="rounded-none"
                          size="sm"
                          className="text-sm"
                          disabled={followPending.has(species.id)}
                          aria-pressed={species.is_followed}
                          aria-label={`${species.is_followed ? "Sparad" : "Spara"}: ${speciesName(species)}`}
                          onClick={() => void toggleFollow(species)}
                        >
                          {species.is_followed ? "Sparad" : "Spara"}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="px-4 py-12 text-center text-sm text-text-muted">
                {appliedSearch.current ? "Inga arter matchar sökningen." : EMPTY_TEXT[season]}
              </p>
            )}
          </div>

          {result.count > PAGE_SIZE ? (
            <Pager
              page={page}
              totalPages={Math.ceil(result.count / PAGE_SIZE)}
              onPageChange={choosePage}
              disabled={loading}
              className="flex items-center justify-between border-t border-border pt-3 text-xs text-text-muted"
              buttonClassName="font-medium text-accent disabled:text-text-faint"
            />
          ) : null}

          {result.without_phenogram.length > 0 ? (
            <details className="text-sm text-text-muted">
              <summary className="cursor-pointer">{result.without_phenogram.length} arter saknar fenogram</summary>
              <p className="mt-1 break-words text-xs">
                {result.without_phenogram.map((item) => item.swedish_name || item.scientific_name).join(", ")}
              </p>
            </details>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
