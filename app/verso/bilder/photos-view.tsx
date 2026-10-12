"use client"

import { AppLink as Link } from "@/app/components/ui/AppLink"
import { Drawer } from "@/app/components/ui/Drawer"
import { EmptyState } from "@/app/components/ui/EmptyState"
import { ImageIcon } from "lucide-react"
import { PhotoUploadForm } from "@/app/verso/bilder/photo-upload-form"
import { PhotoGrid, STAGE_LABELS } from "@/app/verso/bilder/photo-grid"
import { AlbumForm } from "@/app/verso/bilder/album-form"
import { TagForm } from "@/app/verso/bilder/tag-form"
import { PageHeader } from "@/app/verso/ui/PageHeader"
import type { Album, Photo, PhotoStage, PhotoTag } from "@/app/lib/dal"

type Active = { album?: string; tag?: string; stage?: PhotoStage }

function hrefWith(active: Active, key: keyof Active, value: string | undefined) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...active, [key]: value })) {
    if (v) params.set(k, v)
  }
  const query = params.toString()
  return query ? `/bilder?${query}` : "/bilder"
}

function FilterChip({ href, selected, children }: { href: string; selected: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs no-underline duration-200 ${
        selected
          ? "border-accent bg-accent-wash text-accent"
          : "border-border text-text-muted hover:bg-accent-wash hover:text-accent"
      }`}
    >
      {children}
    </Link>
  )
}

export default function PhotosView({
  photos,
  albums,
  tags,
  active,
}: {
  photos: Photo[]
  albums: Album[]
  tags: PhotoTag[]
  active: Active
}) {
  const activeAlbum = albums.find((album) => album.id === active.album)
  const hasFilter = Boolean(active.album || active.tag || active.stage)

  return (
    <div className="container flex min-w-0 flex-1 flex-col gap-4 py-5 sm:py-8">
      <PageHeader
        title="Bilder"
        meta={`${photos.length} st`}
        actions={
          <>
            <Drawer trigger="Nytt album" triggerVariant="secondary" triggerSize="sm" title="Nytt album">
              <AlbumForm />
            </Drawer>
            <Drawer trigger="Ny tagg" triggerVariant="secondary" triggerSize="sm" title="Ny tagg">
              <TagForm />
            </Drawer>
            {activeAlbum && (
              <Drawer trigger="Redigera album" triggerVariant="ghost" triggerSize="sm" triggerClassName="border border-border hover:bg-accent-wash" title="Redigera album">
                <AlbumForm album={activeAlbum} />
              </Drawer>
            )}
            <Drawer trigger="Ladda upp" triggerSize="sm" title="Ladda upp bilder">
              <PhotoUploadForm albums={albums} tags={tags} />
            </Drawer>
          </>
        }
      />

      <div className="flex flex-col gap-2">

        {albums.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {albums.map((album) => (
              <FilterChip
                key={album.id}
                href={hrefWith(active, "album", active.album === album.id ? undefined : album.id)}
                selected={active.album === album.id}
              >
                {album.name} ({album.photo_count})
              </FilterChip>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <FilterChip
                key={tag.id}
                href={hrefWith(active, "tag", active.tag === tag.id ? undefined : tag.id)}
                selected={active.tag === tag.id}
              >
                #{tag.name}
              </FilterChip>
            ))}
          </div>
        )}

        {(active.stage || photos.some((photo) => photo.stage)) && (
          <div className="flex flex-wrap gap-2">
            <FilterChip href={hrefWith(active, "stage", undefined)} selected={!active.stage}>
              Alla skeden
            </FilterChip>
            {(Object.keys(STAGE_LABELS) as (keyof typeof STAGE_LABELS)[]).map((stage) => (
              <FilterChip key={stage} href={hrefWith(active, "stage", stage)} selected={active.stage === stage}>
                {STAGE_LABELS[stage]}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={28} />}
          action={
            hasFilter && (
              <Link href="/bilder" className="text-sm text-accent underline">
                Rensa filter
              </Link>
            )
          }
        >
          {hasFilter ? "Inga bilder matchar filtret." : "Inga bilder ännu. Ladda upp den första."}
        </EmptyState>
      ) : (
        <PhotoGrid photos={photos} albums={albums} tags={tags} />
      )}
    </div>
  )
}
