"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Search, X } from "lucide-react"
import { Pager } from "@/app/components/ui/Pager"
import { useDismissableOpen } from "@/app/components/ui/use-dismissable-open"
import { speciesName, useTempusLocales } from "@/app/tempus/_state/tempus-context"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"
import { OBSERVATION_FILTER_PARAMS, REGISTER_COLUMNS, type ObservationFilterValues } from "./observation-filter-params"

type ScalarKey = Exclude<keyof ObservationFilterValues, "species">

const POPOVER =
  "absolute left-0 top-full z-30 -ml-px min-w-56 border border-border bg-surface p-1 shadow-lg transition-[opacity,translate] duration-150 ease-(--ease-standard) starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none"
const OPTION =
  "flex min-h-9 w-full items-center px-2.5 text-left text-sm text-text-muted transition-colors hover:bg-accent-wash hover:text-text"
const GROUP = "px-2.5 pb-1 pt-2 font-display text-[9px] italic text-text-faint"
const FIELD =
  "h-9 w-full rounded border border-field-border bg-surface px-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
// One cell of the filter row, ruled like the register below it.
const CELL = "border-b border-r border-border"
// A menu filling its cell.
const CELL_TRIGGER = "h-10 w-full justify-between px-3 text-sm hover:bg-accent-wash/20"

// A text trigger that opens a small menu, like the start page's landscape select.
function FilterMenu({
  label,
  value,
  alignRight = false,
  className = "",
  triggerClassName = "text-sm",
  children,
}: {
  label: string
  // The chosen value's text, or null when the filter is not in use.
  value: string | null
  alignRight?: boolean
  className?: string
  triggerClassName?: string
  children: (close: () => void) => ReactNode
}) {
  const { open, setOpen, ref } = useDismissableOpen<HTMLDivElement>()
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-1.5 font-display italic transition-colors hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring ${value ? "text-text" : "text-text-muted"} ${triggerClassName}`}
      >
        <span className="min-w-0 truncate pr-0.5">{value ?? label}</span>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="dialog" aria-label={label} className={`${POPOVER} ${alignRight ? "left-auto right-0 ml-0 -mr-px" : ""}`}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  )
}

function Choices({
  options,
  value,
  onChoose,
}: {
  options: { value: string; label: string }[]
  value: string
  onChoose: (value: string) => void
}) {
  return (
    <ul className="max-h-72 overflow-y-auto">
      {options.map((option) => (
        <li key={option.value}>
          <button
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChoose(option.value)}
            className={`${OPTION} ${option.value === value ? "text-text" : ""}`}
          >
            {option.label}
          </button>
        </li>
      ))}
    </ul>
  )
}

// Newest or oldest first, as the register's time column heading. Keeps every
// other choice in the URL and goes back to the first page.
export function ObservationOrder({ order, className }: { order: ObservationFilterValues["order"]; className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return (
    <FilterMenu
      label={order ? "Tidpunkt, äldst först" : "Tidpunkt, nyast först"}
      value={null}
      className={className}
      triggerClassName="h-full w-full px-3 py-1.5 text-[9px] hover:text-text"
    >
      {(close) => (
        <Choices
          value={order}
          options={[{ value: "", label: "Nyast först" }, { value: "aldst", label: "Äldst först" }]}
          onChoose={(next) => {
            close()
            const params = new URLSearchParams(searchParams)
            if (next) params.set(OBSERVATION_FILTER_PARAMS.order, next)
            else params.delete(OBSERVATION_FILTER_PARAMS.order)
            params.delete("sida")
            const text = params.toString()
            router.push(text ? `${pathname}?${text}` : pathname)
          }}
        />
      )}
    </FilterMenu>
  )
}

// Narrows "Dina observationer". It sits directly above the register, in the
// same columns, each filter over the column it narrows. Every choice lives in
// the URL so a filtered page can be reloaded, shared and paged.
export function ObservationFilter({
  values,
  categories,
  checklists,
}: {
  values: ObservationFilterValues
  categories: { id: string; label: string; count: number }[]
  checklists: { id: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const locales = useTempusLocales()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [period, setPeriod] = useState({ from: values.from, to: values.to })
  const [lifeStage, setLifeStage] = useState(values.lifeStage)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timeout)
  }, [query])

  const searching = debouncedQuery.trim().length >= 2
  const { results, page, setPage, totalPages, loading, error } = useSpeciesPage({
    search: debouncedQuery,
    pageSize: 8,
    enabled: searching,
  })

  const apply = (patch: Partial<ObservationFilterValues>) => {
    const next = { ...values, ...patch }
    const params = new URLSearchParams()
    if (next.species.length > 0) params.set(OBSERVATION_FILTER_PARAMS.species, next.species.map((entry) => entry.taxonId).join(","))
    for (const key of Object.keys(OBSERVATION_FILTER_PARAMS) as (keyof typeof OBSERVATION_FILTER_PARAMS)[]) {
      if (key === "species") continue
      const value = next[key as ScalarKey].trim()
      if (value) params.set(OBSERVATION_FILTER_PARAMS[key], value)
    }
    const text = params.toString()
    router.push(text ? `${pathname}?${text}` : pathname)
  }

  const addSpecies = (item: (typeof results)[number]) => {
    setQuery("")
    setDebouncedQuery("")
    if (values.species.some((entry) => entry.taxonId === item.dyntaxa_taxon_id)) return
    apply({ species: [...values.species, { taxonId: item.dyntaxa_taxon_id, label: speciesName(item) }] })
  }

  const categoryLabel = categories.find((category) => category.id === values.category)?.label ?? null
  const localeLabel = locales.find((locale) => String(locale.id) === values.locale)?.name ?? null
  const checklistLabel = checklists.find((checklist) => checklist.id === values.checklist)?.name ?? null
  const placeLabel = [localeLabel, checklistLabel].filter(Boolean).join(" · ") || null
  const periodLabel = values.from || values.to ? `${values.from || "…"} – ${values.to || "…"}` : null
  const active =
    values.species.length > 0 ||
    Boolean(values.category || values.locale || values.checklist || values.from || values.to || values.lifeStage || values.photos || values.order)

  return (
    <div className="border-l border-border">
      <div className={`grid grid-cols-2 ${REGISTER_COLUMNS}`}>
        <div className={`${CELL} relative col-span-2 flex items-center`}>
          {/* The icon stands in the Nr column, so typed text starts where the species names do. */}
          <span className="flex w-8 shrink-0 items-center justify-center self-stretch border-r border-border text-text-faint sm:w-11">
            <Search size={14} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searching && results[0]) {
                event.preventDefault()
                addSpecies(results[0])
              }
              if (event.key === "Escape") setQuery("")
            }}
            placeholder="Sök art"
            aria-label="Filtrera på art"
            className="h-10 w-full min-w-0 bg-transparent px-3 font-display text-sm italic text-text placeholder:text-text-faint focus:outline-none"
          />
          <FilterMenu label="Artgrupp" value={categoryLabel} alignRight triggerClassName="h-10 shrink-0 px-3 text-sm">
            {(close) => (
              <Choices
                value={values.category}
                options={[{ value: "", label: "Alla artgrupper" }, ...categories.map((category) => ({ value: category.id, label: `${category.label} (${category.count})` }))]}
                onChoose={(category) => { close(); apply({ category }) }}
              />
            )}
          </FilterMenu>
          {searching ? (
            <ul className="absolute -left-px right-[-1px] top-full z-30 border border-border bg-surface p-1 shadow-lg">
              {results.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => addSpecies(item)} className={OPTION}>
                    <span className="truncate">{speciesName(item)}</span>
                    <span className="ml-2 truncate font-display text-xs italic text-text-faint">{item.scientific_name}</span>
                  </button>
                </li>
              ))}
              {loading ? <li className="px-2.5 py-2 text-sm text-text-muted">Hämtar arter…</li> : null}
              {error ? <li className="px-2.5 py-2 text-sm text-danger">{error}</li> : null}
              {!loading && !error && results.length === 0 ? (
                <li className="px-2.5 py-2 text-sm text-text-muted">Inga arter matchar.</li>
              ) : null}
              <Pager
                as="li"
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                disabled={loading}
                label={`${page} / ${totalPages}`}
                className="mt-1 flex items-center justify-between border-t border-border px-2.5 pb-1 pt-2 text-xs text-text-muted"
              />
            </ul>
          ) : null}
        </div>

        <FilterMenu label="Period" value={periodLabel} className={CELL} triggerClassName={CELL_TRIGGER}>
          {(close) => (
            <form
              className="flex flex-col gap-2 p-1.5"
              onSubmit={(event) => { event.preventDefault(); close(); apply(period) }}
            >
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Från
                <input type="date" value={period.from} max={period.to || undefined} onChange={(event) => setPeriod((current) => ({ ...current, from: event.target.value }))} className={FIELD} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Till
                <input type="date" value={period.to} min={period.from || undefined} onChange={(event) => setPeriod((current) => ({ ...current, to: event.target.value }))} className={FIELD} />
              </label>
              <button type="submit" className={`${OPTION} mt-1 border-t border-border text-accent hover:text-accent-hover`}>Visa perioden</button>
            </form>
          )}
        </FilterMenu>

        <FilterMenu label="Plats" value={placeLabel} className={CELL} triggerClassName={CELL_TRIGGER}>
          {(close) => (
            <div className="max-h-80 overflow-y-auto">
              <p className={GROUP}>Plats</p>
              <Choices
                value={values.locale}
                options={[{ value: "", label: "Alla platser" }, ...locales.map((locale) => ({ value: String(locale.id), label: locale.name }))]}
                onChoose={(locale) => { close(); apply({ locale }) }}
              />
              <p className={`${GROUP} mt-1 border-t border-border`}>Checklista</p>
              <Choices
                value={values.checklist}
                options={[{ value: "", label: "Alla checklistor" }, ...checklists.map((checklist) => ({ value: checklist.id, label: checklist.name }))]}
                onChoose={(checklist) => { close(); apply({ checklist }) }}
              />
            </div>
          )}
        </FilterMenu>

        <FilterMenu label="Stadium" value={values.lifeStage || null} className={CELL} triggerClassName={CELL_TRIGGER}>
          {(close) => (
            <form
              className="flex flex-col gap-2 p-1.5"
              onSubmit={(event) => { event.preventDefault(); close(); apply({ lifeStage }) }}
            >
              <input autoFocus value={lifeStage} onChange={(event) => setLifeStage(event.target.value)} placeholder="T.ex. imago" aria-label="Livsstadium" className={FIELD} />
              <button type="submit" className={`${OPTION} border-t border-border text-accent hover:text-accent-hover`}>Visa</button>
            </form>
          )}
        </FilterMenu>

        <FilterMenu
          label="Bilder"
          value={values.photos === "ja" ? "Med bild" : values.photos === "nej" ? "Utan bild" : null}
          className={`${CELL} sm:col-span-2`}
          triggerClassName={CELL_TRIGGER}
          alignRight
        >
          {(close) => (
            <Choices
              value={values.photos}
              options={[{ value: "", label: "Med och utan bilder" }, { value: "ja", label: "Med bilder" }, { value: "nej", label: "Utan bilder" }]}
              onChoose={(photos) => { close(); apply({ photos: photos as ObservationFilterValues["photos"] }) }}
            />
          )}
        </FilterMenu>
      </div>

      {active ? (
        <div className={`${CELL} flex flex-wrap items-center gap-2 px-3 py-2`}>
          {values.species.map((entry) => (
            <span key={entry.taxonId} className="inline-flex items-center gap-1.5 border border-border px-2 py-0.5 font-display text-xs italic text-text">
              {entry.label}
              <button
                type="button"
                onClick={() => apply({ species: values.species.filter((item) => item.taxonId !== entry.taxonId) })}
                aria-label={`Ta bort ${entry.label}`}
                className="text-text-faint hover:text-danger"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => router.push(pathname)} className="ml-auto font-display text-xs italic text-accent hover:text-accent-hover">
            Rensa filter
          </button>
        </div>
      ) : null}
    </div>
  )
}
