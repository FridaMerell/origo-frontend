"use client"

import { useState } from "react"
import { AppLink as Link } from "@/app/components/ui/AppLink"
import { Drawer } from "@/app/components/ui/Drawer"
import { ScrollTextIcon } from "lucide-react"
import { AlbumForm } from "@/app/verso/bilder/album-form"
import { PhotoUploadForm } from "@/app/verso/bilder/photo-upload-form"
import { HistoryTimeline } from "@/app/verso/historia/timeline"
import { PhotoDetail } from "@/app/verso/historia/photo-detail"
import { EventDetail, NewEventForm } from "@/app/verso/historia/event-detail"
import { DocumentDetail } from "@/app/verso/historia/document-detail"
import { DocumentUploadForm } from "@/app/verso/historia/document-upload-form"
import { OnThisDay } from "@/app/verso/historia/on-this-day"
import type {
  Album,
  HistoryEvent,
  HouseDocument,
  OnThisDay as OnThisDayData,
  Person,
  Photo,
  PhotoTag,
} from "@/app/lib/dal"

function AlbumChip({ href, selected, children }: { href: string; selected: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs no-underline duration-200 ${
        selected
          ? "border-accent bg-accent-wash text-accent"
          : "border-border text-text-muted hover:bg-accent-wash hover:text-accent"
      }`}
    >
      {children}
    </Link>
  )
}

export default function HistoryView({
  photos,
  events,
  albums,
  historyAlbums,
  tags,
  people,
  onThisDay,
  documents,
  activeAlbum,
}: {
  documents: HouseDocument[]
  onThisDay: OnThisDayData | null
  photos: Photo[]
  events: HistoryEvent[]
  /** All albums, so saving a photo never drops its membership in non-history albums. */
  albums: Album[]
  historyAlbums: Album[]
  tags: PhotoTag[]
  people: Person[]
  activeAlbum?: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const selectedDoc = documents.find((doc) => doc.id === selectedDocId)
  const selected = photos.find((photo) => photo.id === selectedId)
  const selectedEvent = events.find((event) => event.id === selectedEventId)
  const active = historyAlbums.find((album) => album.id === activeAlbum)
  const defaultAlbums = active ? [active.id] : historyAlbums.length === 1 ? [historyAlbums[0].id] : []
  const isEmpty = photos.length === 0 && events.length === 0 && documents.length === 0

  return (
    <div className="container flex flex-1 flex-col gap-4 py-5 sm:py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-display font-semibold">Historia</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/historia/personer"
            className="rounded px-2.5 py-1.5 text-sm text-text-muted no-underline duration-200 hover:bg-accent-wash hover:text-accent"
          >
            Personer ({people.length})
          </Link>
          <Drawer
            trigger="Ny händelse"
            triggerVariant="secondary"
            triggerSize="sm"
            title="Ny händelse"
            panelClassName="max-w-2xl!"
          >
            <NewEventForm people={people} photos={photos} />
          </Drawer>
          <Drawer trigger="Ladda upp fil" triggerVariant="secondary" triggerSize="sm" title="Ladda upp fil">
            <DocumentUploadForm onUploaded={(ids) => setSelectedDocId(ids[0] ?? null)} />
          </Drawer>
          {historyAlbums.length > 0 && (
            <Drawer trigger="Ladda upp bild" triggerSize="sm" title="Ladda upp bild">
              <PhotoUploadForm
                albums={albums}
                tags={tags}
                defaultAlbums={defaultAlbums}
                requireAlbum
                minimal
                // Open the first new document so its history can be filled in right away.
                onUploaded={(ids) => setSelectedId(ids[0] ?? null)}
              />
            </Drawer>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {historyAlbums.length > 0 && (
          <>
            <AlbumChip href="/historia" selected={!active}>
              Alla
            </AlbumChip>
            {historyAlbums.map((album) => (
              <AlbumChip
                key={album.id}
                href={`/historia?album=${encodeURIComponent(album.id)}`}
                selected={active?.id === album.id}
              >
                {album.name} ({album.photo_count})
              </AlbumChip>
            ))}
          </>
        )}
        <Drawer trigger="Nytt historiealbum" triggerVariant="ghost" triggerSize="sm" title="Nytt historiealbum">
          <AlbumForm defaultKind="history" />
        </Drawer>
        {active && (
          <Drawer trigger="Redigera album" triggerVariant="ghost" triggerSize="sm" title="Redigera album">
            <AlbumForm album={active} />
          </Drawer>
        )}
      </div>

      <OnThisDay data={onThisDay} onOpenEvent={setSelectedEventId} onOpenPhoto={setSelectedId} />

      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-12 text-center text-text-muted">
          <ScrollTextIcon size={28} />
          <p className="text-sm">
            {historyAlbums.length === 0
              ? "Lägg till en händelse, eller skapa ett historiealbum för att lägga upp dokument."
              : "Inget här ännu. Lägg till en händelse eller ladda upp den första filen."}
          </p>
        </div>
      ) : (
        <HistoryTimeline
          photos={photos}
          events={events}
          people={people}
          allPhotos={photos}
          onOpenPhoto={setSelectedId}
          onOpenEvent={setSelectedEventId}
          documents={documents}
          onOpenDocument={setSelectedDocId}
        />
      )}

      <Drawer
        title={selected?.title || "Dokument"}
        panelClassName="max-w-5xl!"
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        {selected && <PhotoDetail key={selected.id} photo={selected} albums={albums} people={people} />}
      </Drawer>

      <Drawer
        title={selectedDoc?.title || "Dokument"}
        panelClassName="max-w-5xl!"
        open={Boolean(selectedDoc)}
        onOpenChange={(open) => {
          if (!open) setSelectedDocId(null)
        }}
      >
        {selectedDoc && <DocumentDetail key={selectedDoc.id} doc={selectedDoc} people={people} tags={tags} />}
      </Drawer>

      <Drawer
        title={selectedEvent?.title || "Händelse"}
        panelClassName="max-w-2xl!"
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null)
        }}
      >
        {selectedEvent && (
          <EventDetail key={selectedEvent.id} event={selectedEvent} people={people} photos={photos} />
        )}
      </Drawer>
    </div>
  )
}
