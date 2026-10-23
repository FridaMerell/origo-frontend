"use client"

import { useState } from "react"
import Link from "next/link"
import { Lightbox } from "@/app/components/ui/Gallery"
import { fileProxyUrl } from "@/app/lib/files"
import { formatDateLongOrNull } from "@/app/lib/formatters"
import { formatUserName } from "@/app/lib/format-user-name"
import type { TempusPublicObservation } from "@/app/lib/dal/tempus/observations"
import { thumbnailPath } from "@/app/tempus/observationer/observation-photos"

// Up to this many photos fill the column; more become a sideways strip.
const FILL_LIMIT = 3

export default function SpeciesPhotos({ observations, name, scientificName }: {
  observations: TempusPublicObservation[]
  name: string
  scientificName?: string
}) {
  const [open, setOpen] = useState<number | null>(null)
  const photos = observations.flatMap((observation) =>
    observation.photos.map((photo) => ({ photo, observation })),
  )
  const fill = photos.length <= FILL_LIMIT
  let photoIndex = 0

  return (
    <>
      <div className="flex gap-[clamp(1rem,2.5vw,2.5rem)] overflow-x-auto pb-1 max-sm:-mr-4 max-sm:snap-x max-sm:snap-mandatory max-sm:pr-4 max-sm:[scrollbar-width:none] sm:[scrollbar-width:thin]">
        {observations.map((observation) => (
          <figure
            key={observation.id}
            className={fill ? "shrink-0 sm:min-w-0 sm:shrink sm:basis-0" : "shrink-0"}
            // Capped so a lone photo keeps its shape and the thumbnail is never upscaled.
            style={fill ? { flexGrow: observation.photos.length, maxWidth: `${observation.photos.length * 40}rem` } : undefined}
          >
            <div
              className={fill ? "flex gap-1.5 sm:grid" : "flex gap-1.5"}
              style={fill ? { gridTemplateColumns: `repeat(${observation.photos.length}, minmax(0, 1fr))` } : undefined}
            >
              {observation.photos.map((photo) => {
                const index = photoIndex++
                return (
                  <button
                    key={photo}
                    type="button"
                    onClick={() => setOpen(index)}
                    aria-label={`Visa bilden på ${name}`}
                    className="group block shrink-0 cursor-zoom-in snap-start overflow-hidden bg-surface-2 max-sm:w-[80vw]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileProxyUrl(thumbnailPath(photo))}
                      alt={name}
                      loading="lazy"
                      decoding="async"
                      className={`block aspect-[3/2] w-full object-cover transition-transform duration-600 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.03] ${fill ? "" : "sm:h-[clamp(12rem,26vw,24rem)] sm:w-auto"}`}
                    />
                  </button>
                )
              })}
            </div>
            <figcaption className="mt-3 flex flex-col gap-0.5">
              <Link
                href={`/observationer/${observation.id}`}
                className="w-fit font-display text-lg font-semibold text-text no-underline hover:text-accent"
              >
                {formatDateLongOrNull(observation.observed_at) ?? "—"}
              </Link>
              <span className="text-sm text-text-muted">{formatUserName(observation)}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {open !== null && (
        <Lightbox
          images={photos.map(({ photo }) => photo)}
          index={open}
          onClose={() => setOpen(null)}
          onNavigate={setOpen}
          captions={photos.map(({ observation }) => (
            <div key={observation.id} className="flex flex-col gap-0.5">
              <span className="font-display text-xl font-semibold capitalize">{name}</span>
              {scientificName && <em className="font-mono text-sm text-white/60">{scientificName}</em>}
              <span className="text-sm text-white/75">
                {formatDateLongOrNull(observation.observed_at) ?? "—"} · {formatUserName(observation)}
              </span>
            </div>
          ))}
        />
      )}
    </>
  )
}
