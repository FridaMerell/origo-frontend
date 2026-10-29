"use client"

import { FileTextIcon } from "lucide-react"
import { documentTypeLabel } from "@/app/verso/historia/document-detail"
import { fileProxyUrl } from "@/app/lib/files"
import { decadeOf, formatHistoricalDate } from "@/app/lib/history-date"
import type { DatePrecision, HistoryEvent, HouseDocument, Person, Photo } from "@/app/lib/dal"

type Item =
  | { key: string; kind: "photo"; date: string | null; precision: DatePrecision; photo: Photo }
  | { key: string; kind: "event"; date: string; precision: DatePrecision; event: HistoryEvent }
  | { key: string; kind: "document"; date: string | null; precision: DatePrecision; doc: HouseDocument }

/** Items sharing a margin label: one year, "ca <year>", or "Okänt år" when only the decade is known. */
type YearBlock = { label: string | null; events: HistoryEvent[]; photos: Photo[]; docs: HouseDocument[] }

type Group = { decade: number | null; blocks: YearBlock[] }

function marginLabel(item: Item): string | null {
  if (!item.date) return null
  if (item.precision === "decade") return "Okänt år"
  if (item.precision === "circa") return formatHistoricalDate(item.date, "circa")
  return item.date.slice(0, 4)
}

function buildGroups(photos: Photo[], events: HistoryEvent[], documents: HouseDocument[]): Group[] {
  const items: Item[] = [
    ...photos.map((photo): Item => ({
      key: `p${photo.id}`, kind: "photo", date: photo.taken_at, precision: photo.date_precision, photo,
    })),
    ...events.map((event): Item => ({
      key: `e${event.id}`, kind: "event", date: event.date_start, precision: event.date_precision, event,
    })),
    ...documents.map((doc): Item => ({
      key: `d${doc.id}`, kind: "document", date: doc.document_date, precision: doc.date_precision, doc,
    })),
  ].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))

  const groups: Group[] = []
  for (const item of items) {
    const decade = decadeOf(item.date)
    let group = groups[groups.length - 1]
    if (!group || group.decade !== decade) {
      group = { decade, blocks: [] }
      groups.push(group)
    }
    const label = marginLabel(item)
    let block = group.blocks.find((candidate) => candidate.label === label)
    if (!block) {
      block = { label, events: [], photos: [], docs: [] }
      group.blocks.push(block)
    }
    if (item.kind === "event") block.events.push(item.event)
    else if (item.kind === "photo") block.photos.push(item.photo)
    else block.docs.push(item.doc)
  }
  return groups
}

/** Day or month within the year, shown only when known; the year itself is in the margin. */
function dayOf(date: string | null, precision: DatePrecision): string | null {
  if (!date || (precision !== "day" && precision !== "month")) return null
  return formatHistoricalDate(date, precision).replace(/\s*\d{4}$/, "")
}

function personNames(ids: string[], people: Person[]): string | null {
  const names = people.filter((person) => ids.map(String).includes(String(person.id))).map((person) => person.name)
  if (names.length === 0) return null
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} och ${names[names.length - 1]}`
}

function Thumb({ photo, onOpen, size }: { photo: Photo; onOpen: (id: string) => void; size: string }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(photo.id)}
      aria-label={photo.title || "Öppna dokument"}
      title={photo.title || undefined}
      className={`${size} shrink-0 overflow-hidden rounded-lg border border-border bg-accent-wash focus-visible:outline-2 focus-visible:outline-accent`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileProxyUrl(photo.thumbnail_url || photo.url)}
        alt={photo.title || ""}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    </button>
  )
}

/** Vertical timeline grouped by decade and year, mixing history events, dated photos and documents. */
export function HistoryTimeline({
  photos,
  events,
  people,
  allPhotos,
  onOpenPhoto,
  onOpenEvent,
  documents,
  onOpenDocument,
}: {
  onOpenEvent: (id: string) => void
  documents: HouseDocument[]
  onOpenDocument: (id: string) => void
  photos: Photo[]
  events: HistoryEvent[]
  people: Person[]
  /** Everything an event may link to, so its thumbnails resolve even if hidden by a filter. */
  allPhotos: Photo[]
  onOpenPhoto: (id: string) => void
}) {
  const groups = buildGroups(photos, events, documents)

  return (
    <div className="ml-1.5 flex flex-col gap-12 border-l border-border pl-6 sm:pl-8">
      {groups.map((group) => (
        <section key={group.decade ?? "undated"} className="relative flex flex-col">
          <span
            aria-hidden
            className="absolute -left-[31px] top-3 size-3 rounded-full border-2 border-bg bg-accent sm:-left-[39px]"
          />
          <h2 className="m-0 border-b border-border pb-2 font-display text-2xl font-semibold text-text">
            {group.decade === null ? "Odaterat" : `${group.decade}-talet`}
          </h2>

          <div className="flex flex-col divide-y divide-border">
            {group.blocks.map((block) => (
              <div
                key={block.label ?? "undated"}
                className="grid gap-x-6 gap-y-3 py-5 sm:grid-cols-[6rem_minmax(0,1fr)]"
              >
                {block.label && /^\d{4}$/.test(block.label) ? (
                  <span className="font-display text-xl font-semibold leading-tight text-text-muted">{block.label}</span>
                ) : (
                  <span className="pt-1 text-sm text-text-faint">{block.label}</span>
                )}

                <div className="flex min-w-0 flex-col gap-5">
                  {block.events.map((event) => {
                    const meta = [dayOf(event.date_start, event.date_precision), event.place].filter(Boolean).join(" · ")
                    const names = personNames(event.people, people)
                    const linked = allPhotos.filter((photo) => event.photos.map(String).includes(String(photo.id)))
                    return (
                      <article key={event.id} className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEvent(event.id)}
                          className="self-start text-left font-display text-lg font-semibold leading-snug text-text hover:text-accent"
                        >
                          {event.title}
                        </button>
                        {meta && <span className="text-sm text-text-faint">{meta}</span>}
                        {event.description && (
                          <p className="m-0 mt-1 line-clamp-3 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                            {event.description}
                          </p>
                        )}
                        {names && <span className="text-sm text-text-muted">{names}</span>}
                        {linked.length > 0 && (
                          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                            {linked.map((photo) => (
                              <Thumb key={photo.id} photo={photo} onOpen={onOpenPhoto} size="h-16 w-20" />
                            ))}
                          </div>
                        )}
                      </article>
                    )
                  })}

                  {block.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {block.photos.map((photo) => (
                        <Thumb key={photo.id} photo={photo} onOpen={onOpenPhoto} size="h-28 w-36" />
                      ))}
                    </div>
                  )}

                  {block.docs.length > 0 && (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {block.docs.map((doc) => {
                        const meta = [documentTypeLabel(doc), dayOf(doc.document_date, doc.date_precision), personNames(doc.people, people)]
                          .filter(Boolean)
                          .join(" · ")
                        return (
                          <li key={doc.id}>
                            <button
                              type="button"
                              onClick={() => onOpenDocument(doc.id)}
                              className="group flex items-center gap-3 text-left"
                            >
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-accent-wash text-text-muted">
                                <FileTextIcon size={16} />
                              </span>
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-semibold text-text group-hover:text-accent">
                                  {doc.title}
                                </span>
                                <span className="truncate text-xs text-text-faint">{meta}</span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
