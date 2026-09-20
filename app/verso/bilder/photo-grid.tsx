"use client"

import { useState } from "react"
import { Drawer } from "@/app/components/ui/Drawer"
import { PhotoEditForm } from "@/app/verso/bilder/photo-edit-form"
import { fileProxyUrl } from "@/app/lib/files"
import type { Album, Photo, PhotoStage, PhotoTag } from "@/app/lib/dal"

export const STAGE_LABELS: Record<Exclude<PhotoStage, "">, string> = {
  before: "Före",
  during: "Under",
  after: "Efter",
}

/** Thumbnail grid; clicking a photo opens its edit drawer. Renders nothing for an empty list. */
export function PhotoGrid({
  photos,
  albums,
  tags,
}: {
  photos: Photo[]
  albums: Album[]
  tags: PhotoTag[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = photos.find((photo) => photo.id === selectedId)

  return (
    <>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-accent-wash"
            >
              <button
                type="button"
                onClick={() => setSelectedId(photo.id)}
                aria-label={photo.title || "Redigera bild"}
                className="size-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                {/* The bucket is private, so files are streamed through /api/files. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileProxyUrl(photo.thumbnail_url || photo.url)}
                  alt={photo.title || photo.description || ""}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
              {photo.title && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/60 to-transparent px-2 pb-1.5 pt-6 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                  {photo.title}
                </span>
              )}
              {photo.stage && (
                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-surface/90 px-1.5 py-0.5 text-xs text-text">
                  {STAGE_LABELS[photo.stage]}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <Drawer
        title="Bild"
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        {selected && <PhotoEditForm key={selected.id} photo={selected} albums={albums} tags={tags} />}
      </Drawer>
    </>
  )
}
