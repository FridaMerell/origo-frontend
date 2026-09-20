"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { Card } from "@/app/components/ui/Card"
import { Button } from "@/app/components/ui/Button"
import { Tabs, type TabItem } from "@/app/components/ui/Tabs"
import { BackLink } from "@/app/verso/ui/DetailPage"
import { PersonForm, lifespan } from "@/app/verso/historia/person-form"
import { PersonRelations, familyOf } from "@/app/verso/historia/person-relations"
import { FamilyTree } from "@/app/verso/historia/personer/family-tree"
import { formatHistoricalDate } from "@/app/lib/history-date"
import { fileProxyUrl } from "@/app/lib/files"
import { setPersonPortrait } from "@/app/actions/history"
import type { HistoryEvent, HouseDocument, Person, PersonRelation, Photo } from "@/app/lib/dal"

type TabId = "overview" | "tree" | "family" | "photos" | "history"

const personHref = (id: string) => `/historia/personer?person=${encodeURIComponent(id)}`

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function Avatar({ name, photo, size }: { name: string; photo?: Photo | null; size: string }) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fileProxyUrl(photo.thumbnail_url || photo.url)}
        alt={`Porträtt av ${name}`}
        className={`${size} shrink-0 rounded-full border border-border object-cover`}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={`${size} flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 font-semibold text-text-muted`}
    >
      {initials(name)}
    </span>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-semibold text-text-faint">{label}</dt>
      <dd className="m-0 text-sm text-text">{children}</dd>
    </div>
  )
}

export default function PersonsView({
  people,
  relations,
  events,
  documents,
  photos,
  portrait,
  selectedId,
}: {
  people: Person[]
  relations: PersonRelation[]
  events: HistoryEvent[]
  documents: HouseDocument[]
  /** Photos depicting the selected person. */
  photos: Photo[]
  portrait: Photo | null
  selectedId?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [mode, setMode] = useState<"view" | "edit" | "new">("view")
  const [tab, setTab] = useState<TabId>("overview")
  const [portraitError, setPortraitError] = useState<string | undefined>()

  const selected = people.find((p) => String(p.id) === selectedId)
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name, "sv"))
  const shown = sorted.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))

  const personEvents = selected ? events.filter((e) => e.people.map(String).includes(String(selected.id))) : []
  const personDocs = selected ? documents.filter((d) => d.people.map(String).includes(String(selected.id))) : []
  const family = selected ? familyOf(selected, people, relations) : null
  const familyCount = family
    ? family.parents.length + family.children.length + family.partners.length + family.siblings.length + family.others.length
    : 0

  const tabs: TabItem<TabId>[] = [
    { id: "overview", label: "Översikt" },
    { id: "tree", label: "Släktträd" },
    { id: "family", label: "Släktband", count: familyCount },
    { id: "photos", label: "Bilder", count: photos.length },
    { id: "history", label: "I historien", count: personEvents.length + personDocs.length },
  ]

  async function changePortrait(person: Person, photo: string | null) {
    const result = await setPersonPortrait(person.id, photo)
    setPortraitError(result?.error)
  }

  return (
    <div className="container flex flex-1 flex-col gap-4 py-5 sm:py-8">
      <BackLink href="/historia">Historia</BackLink>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-display font-semibold">
          Personer <span className="text-sm font-normal text-text-faint">{people.length}</span>
        </h1>
        <Button type="button" variant="primary" size="sm" onClick={() => setMode("new")}>
          Ny person
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <Card className="flex flex-col gap-3 !p-3 md:col-span-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök person"
            aria-label="Sök person"
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-sm text-text"
          />
          {people.length === 0 ? (
            <p className="m-0 px-1 text-sm text-text-muted">Inga personer ännu.</p>
          ) : shown.length === 0 ? (
            <p className="m-0 px-1 text-sm text-text-muted">Ingen träff.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {shown.map((person) => {
                const active = selected?.id === person.id && mode !== "new"
                return (
                  <li key={person.id}>
                    <Link
                      href={personHref(person.id)}
                      onClick={() => setMode("view")}
                      className={`flex items-center gap-2.5 rounded px-2 py-1.5 no-underline duration-200 ${
                        active ? "bg-surface-2 text-text" : "text-text hover:bg-surface-2"
                      }`}
                    >
                      <Avatar name={person.name} size="size-8 text-xs" />
                      <span className="flex min-w-0 flex-col">
                        <span className={`truncate text-sm ${active ? "font-semibold" : "font-medium"}`}>
                          {person.name}
                        </span>
                        <span className="truncate text-xs text-text-faint">
                          {lifespan(person) || person.relation}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="flex min-w-0 flex-col gap-5 md:col-span-3">
          {mode === "new" ? (
            <>
              <h2 className="m-0 font-display text-xl font-semibold text-text">Ny person</h2>
              <PersonForm
                onDone={(id) => {
                  setMode("view")
                  if (id) router.push(personHref(id))
                }}
              />
            </>
          ) : !selected ? (
            <p className="m-0 text-sm text-text-muted">
              Välj en person i listan för att se släktträd, bilder och kopplingar.
            </p>
          ) : mode === "edit" ? (
            <>
              <h2 className="m-0 font-display text-xl font-semibold text-text">Redigera {selected.name}</h2>
              <PersonForm
                key={selected.id}
                person={selected}
                onDone={() => setMode("view")}
                onDeleted={() => router.push("/historia/personer")}
              />
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar name={selected.name} photo={portrait} size="size-20 text-xl" />
                  <div className="flex min-w-0 flex-col">
                    <h2 className="m-0 truncate font-display text-2xl font-semibold text-text">{selected.name}</h2>
                    <span className="text-sm text-text-muted">
                      {[lifespan(selected), selected.relation].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => setMode("edit")}>
                  Redigera
                </Button>
              </div>

              <Tabs tabs={tabs} active={tab} onChange={setTab} />

              {tab === "overview" && (
                <div className="flex flex-col gap-4">
                  <dl className="m-0 grid gap-3 sm:grid-cols-2">
                    <Fact label="Född">
                      {selected.birth_date &&
                        formatHistoricalDate(selected.birth_date, selected.birth_date_precision)}
                    </Fact>
                    <Fact label="Död">
                      {selected.death_date &&
                        formatHistoricalDate(selected.death_date, selected.death_date_precision)}
                    </Fact>
                    <Fact label="Relation till huset">{selected.relation}</Fact>
                  </dl>
                  {selected.notes ? (
                    <p className="m-0 whitespace-pre-wrap text-sm text-text">{selected.notes}</p>
                  ) : (
                    <p className="m-0 text-sm text-text-faint">Inga anteckningar ännu.</p>
                  )}
                </div>
              )}

              {tab === "tree" && (
                <FamilyTree person={selected} people={people} relations={relations} personHref={personHref} />
              )}

              {tab === "family" && (
                <PersonRelations
                  key={selected.id}
                  person={selected}
                  people={people}
                  relations={relations}
                  personHref={personHref}
                />
              )}

              {tab === "photos" && (
                <div className="flex flex-col gap-3">
                  {photos.length === 0 ? (
                    <p className="m-0 text-sm text-text-faint">
                      Inga bilder ännu. Markera personen på en bild under Historia så dyker den upp här.
                    </p>
                  ) : (
                    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
                      {photos.map((photo) => {
                        const isPortrait = String(selected.portrait) === String(photo.id)
                        return (
                          <li key={photo.id} className="flex flex-col gap-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fileProxyUrl(photo.thumbnail_url || photo.url)}
                              alt={photo.title}
                              loading="lazy"
                              className="aspect-square w-full rounded-lg border border-border object-cover"
                            />
                            <Button
                              type="button"
                              variant={isPortrait ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() => changePortrait(selected, isPortrait ? null : photo.id)}
                            >
                              {isPortrait ? "Porträtt (ta bort)" : "Använd som porträtt"}
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {portraitError && <p role="alert" className="m-0 text-xs text-danger">{portraitError}</p>}
                </div>
              )}

              {tab === "history" &&
                (personEvents.length + personDocs.length === 0 ? (
                  <p className="m-0 text-sm text-text-faint">
                    Personen är inte kopplad till några händelser eller dokument ännu.
                  </p>
                ) : (
                  <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
                    {personEvents.map((event) => (
                      <li key={`e${event.id}`} className="flex items-baseline gap-3 py-2 text-sm text-text">
                        <span className="w-28 shrink-0 text-xs text-text-faint">
                          {formatHistoricalDate(event.date_start, event.date_precision)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{event.title}</span>
                        <span className="text-xs text-text-faint">Händelse</span>
                      </li>
                    ))}
                    {personDocs.map((doc) => (
                      <li key={`d${doc.id}`} className="flex items-baseline gap-3 py-2 text-sm text-text">
                        <span className="w-28 shrink-0 text-xs text-text-faint">
                          {formatHistoricalDate(doc.document_date, doc.date_precision)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                        <span className="text-xs text-text-faint">Dokument</span>
                      </li>
                    ))}
                  </ul>
                ))}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
