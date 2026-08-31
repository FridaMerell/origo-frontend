"use client"

import Link from "next/link"
import type { TempusSpecies } from "@/app/lib/dal"
import { BiotopeMap, biotopePropsFromSpecies } from "@/app/tempus/ui/biotope-map/BiotopeMap"

export default function SpeciesWidget({
  species,
  speciesHref,
}: {
  species: TempusSpecies
  speciesHref?: string | null
}) {
  const speciesLabel = species.swedish_name || species.scientific_name
  const facts: Array<[string, string]> = [
    ["Vetenskapligt namn", species.scientific_name],
    ["Dyntaxa taxon-ID", String(species.dyntaxa_taxon_id)],
    ["Taxonomisk rang", species.taxon_rank],
    ["Status", species.is_active ? "Aktiv" : "Inaktiv"],
  ]
  const habitatGroups = [
    ["Landskapstyper", species.landscape_types?.map((item) => item.name) ?? []],
    ["Biotoper", species.biotopes?.map((item) => item.name) ?? []],
  ] as const

  return (
    <article className="overflow-hidden rounded-card border border-border bg-surface text-text shadow-card">
      <header className="px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
        <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
          <span>Artuppgifter</span>
          <span>Taxon {species.dyntaxa_taxon_id}</span>
        </div>

        <div className="grid border-b border-border sm:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="flex min-h-24 flex-col items-center justify-center px-3 py-4 text-center">
            <h2 className="font-display text-3xl font-medium italic tracking-wide sm:text-4xl">
              {speciesLabel}
            </h2>
            {species.swedish_name ? (
              <p className="mt-2 font-display text-sm italic text-text-muted">{species.scientific_name}</p>
            ) : null}
          </div>
          <div className="relative min-h-24 overflow-hidden border-t border-border bg-surface-2/25 sm:border-l sm:border-t-0">
            <BiotopeMap
              {...biotopePropsFromSpecies(species)}
              compass={false}
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 h-full w-full opacity-45"
              style={{ width: "100%", height: "100%" }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-surface/75 via-transparent to-transparent" />
            <span className="absolute bottom-1.5 left-2 font-display text-[9px] italic text-text-muted">
              Biotopskiss
            </span>
          </div>
        </div>
      </header>

      <dl className="grid border-l border-t border-border sm:grid-cols-2">
        {facts.map(([term, value]) => (
          <div key={term} className="border-b border-r border-border px-3 py-2">
            <dt className="font-display text-[9px] italic text-text-faint">{term}</dt>
            <dd className="mt-1 font-display text-sm italic text-text">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      <section className="border-t border-border px-4 py-3 sm:px-5">
        <h3 className="font-mono text-[11px] uppercase tracking-[.16em] text-text-faint">Biotopdata</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {habitatGroups.map(([label, values]) => (
            <div key={label}>
              <h4 className="font-display text-sm italic text-text-muted">{label}</h4>
              {values.length > 0 ? (
                <ul className="mt-1 space-y-0.5 font-display text-sm leading-5 text-text">
                  {values.slice(0, 6).map((value) => <li key={value}>{value}</li>)}
                  {values.length > 6 ? (
                    <li className="pt-1 text-xs text-text-muted">+ {values.length - 6} fler</li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-1 font-display text-sm italic text-text-muted">—</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-4">
          {speciesHref ? (
            <Link
              href={speciesHref}
              className="font-display text-sm italic text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent-hover"
            >
              Visa art
            </Link>
          ) : null}
          <a
            href={`https://artfakta.se/taxa/${species.dyntaxa_taxon_id}/information`}
            target="_blank"
            rel="noreferrer"
            className="font-display text-sm italic text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent-hover"
          >
            Visa artfakta
          </a>
        </div>
      </div>
    </article>
  )
}
