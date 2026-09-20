"use client"

import { CalendarIcon, FileTextIcon } from "lucide-react"
import { documentTypeLabel } from "@/app/verso/historia/document-detail"
import { fileProxyUrl } from "@/app/lib/files"
import { decadeOf, formatHistoricalDate } from "@/app/lib/history-date"
import type { HistoryEvent, HouseDocument, Person, Photo } from "@/app/lib/dal"

type Item =
  | { key: string; kind: "photo"; date: string | null; photo: Photo }
  | { key: string; kind: "event"; date: string; event: HistoryEvent }
  | { key: string; kind: "document"; date: string | null; doc: HouseDocument }

type Group = { decade: number | null; items: Item[] }

function buildGroups(photos: Photo[], events: HistoryEvent[], documents: HouseDocument[]): Group[] {
  const items: Item[] = [
    ...photos.map((photo): Item => ({ key: `p${photo.id}`, kind: "photo", date: photo.taken_at, photo })),
    ...events.map((event): Item => ({ key: `e${event.id}`, kind: "event", date: event.date_start, event })),
    ...documents.map((doc): Item => ({ key: `d${doc.id}`, kind: "document", date: doc.document_date, doc })),
  ].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))

  const groups: Group[] = []
  for (const item of items) {
    const decade = decadeOf(item.date)
    const last = groups[groups.length - 1]
    if (last && last.decade === decade) last.items.push(item)
    else groups.push({ decade, items: [item] })
  }
  return groups
}

function PersonChips({ ids, people }: { ids: string[]; people: Person[] }) {
  const named = people.filter((person) => ids.map(String).includes(String(person.id)))
  if (named.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1.5">
      {named.map((person) => (
        <span key={person.id} className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
          {person.name}
        </span>
      ))}
    </span>
  )
}

function Thumb({ photo, onOpen, size }: { photo: Photo; onOpen: (id: string) => void; size: string }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(photo.id)}
      aria-label={photo.title || "Öppna dokument"}
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

/** Vertical timeline grouped by decade, mixing history events and dated photos. */
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
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.decade ?? "undated"} className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-lg font-semibold text-text">
            {group.decade === null ? "Odaterat" : `${group.decade}-talet`}
          </h2>
          <ol className="m-0 flex list-none flex-col gap-4 border-l border-border p-0 pl-5">
            {group.items.map((item) => (
              <li key={item.key} className="relative flex gap-3">
                <span
                  aria-hidden
                  className="absolute -left-[25px] top-2 size-2.5 rounded-full border-2 border-surface bg-accent"
                />
                {item.kind === "document" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenDocument(item.doc.id)}
                      aria-label={item.doc.title}
                      className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-accent-wash text-text-muted focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <FileTextIcon size={22} />
                      <span className="text-xs font-medium">{documentTypeLabel(item.doc)}</span>
                    </button>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-xs text-text-faint">
                        {formatHistoricalDate(item.doc.document_date, item.doc.date_precision)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenDocument(item.doc.id)}
                        className="self-start truncate text-left text-sm font-semibold text-text hover:text-accent"
                      >
                        {item.doc.title}
                      </button>
                      <PersonChips ids={item.doc.people} people={people} />
                    </div>
                  </>
                ) : item.kind === "photo" ? (
                  <>
                    <Thumb photo={item.photo} onOpen={onOpenPhoto} size="size-20" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-xs text-text-faint">
                        {formatHistoricalDate(item.photo.taken_at, item.photo.date_precision)}
                        {item.photo.place && ` · ${item.photo.place}`}
                      </span>
                      <span className="truncate text-sm font-semibold text-text">
                        {item.photo.title || "Utan titel"}
                      </span>
                      <PersonChips ids={item.photo.people ?? []} people={people} />
                    </div>
                  </>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border border-border bg-surface p-3">
                    <span className="flex items-center gap-1.5 text-xs text-text-faint">
                      <CalendarIcon size={12} />
                      {formatHistoricalDate(item.event.date_start, item.event.date_precision)}
                      {item.event.place && ` · ${item.event.place}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenEvent(item.event.id)}
                      className="self-start text-left text-sm font-semibold text-text hover:text-accent"
                    >
                      {item.event.title}
                    </button>
                    {item.event.description && (
                      <p className="m-0 line-clamp-3 whitespace-pre-wrap text-sm text-text-muted">
                        {item.event.description}
                      </p>
                    )}
                    <PersonChips ids={item.event.people} people={people} />
                    <span className="flex flex-wrap gap-2">
                      {allPhotos
                        .filter((photo) => item.event.photos.map(String).includes(String(photo.id)))
                        .map((photo) => (
                          <Thumb key={photo.id} photo={photo} onOpen={onOpenPhoto} size="size-14" />
                        ))}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
