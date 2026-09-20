"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { usePathname } from "next/navigation"
import { zodResolver } from "@/app/components/form/zodResolver"
import { deletePhoto, setAlbumCover, updatePhoto } from "@/app/actions/photo"
import { photoFormSchema, type PhotoFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { Button } from "@/app/components/ui/Button"
import { useDrawerClose } from "@/app/components/ui/Drawer"
import { useVentureData } from "@/app/verso/_state/verso-context"
import { fileProxyUrl } from "@/app/lib/files"
import { withoutHistoryFields } from "@/app/verso/bilder/history-fields"
import type { Album, Photo, PhotoTag } from "@/app/lib/dal"

export function PhotoEditForm({
  photo,
  albums,
  tags,
}: {
  photo: Photo
  albums: Album[]
  tags: PhotoTag[]
}) {
  const { ventures } = useVentureData()
  const pathname = usePathname()
  const closeDrawer = useDrawerClose()
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PhotoFormValues>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: {
      title: photo.title,
      description: photo.description,
      venture: photo.venture ?? "",
      task: photo.task ?? "",
      stage: photo.stage,
      albums: photo.albums.map(String),
      tags: photo.tags.map(String),
      taken_at: photo.taken_at?.slice(0, 10) ?? "",
      date_precision: photo.date_precision ?? "day",
      place: photo.place ?? "",
      source: photo.source ?? "",
      transcription: photo.transcription ?? "",
      credit: photo.credit ?? "",
      people: (photo.people ?? []).map(String),
    },
  })
  const submit = useSubmitAction(setError)
  const hasVenture = Boolean(watch("venture"))

  const onSubmit = handleSubmit((data) => {
    const staged = hasVenture ? data : { ...data, stage: "" as const, task: "" }
    // History details are edited on /historia; leaving them out keeps the saved values.
    return submit(() => updatePhoto(photo.id, withoutHistoryFields(staged), pathname), closeDrawer)
  })

  // Uses the saved album membership; a newly ticked album needs a save first.
  const photoAlbums = albums.filter((album) => photo.albums.map(String).includes(String(album.id)))

  async function onSetCover(album: Album) {
    const result = await setAlbumCover(album.id, photo.id)
    if (result?.error) setError("root", { message: result.error })
  }

  async function onDelete() {
    if (!window.confirm("Ta bort bilden?")) return
    setDeleting(true)
    const result = await deletePhoto(photo.id, pathname)
    setDeleting(false)
    if (result?.error) {
      setError("root", { message: result.error })
      return
    }
    closeDrawer()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileProxyUrl(photo.url)}
        alt={photo.title}
        className="max-h-80 w-full rounded-lg bg-accent-wash object-contain"
      />

      <Field label="Titel" error={errors.title}>
        <input type="text" className={fieldInputClass} {...register("title")} />
      </Field>

      <Field label="Beskrivning" error={errors.description}>
        <textarea className={fieldInputClass} {...register("description")} />
      </Field>

      {albums.length > 0 && (
        <Field label="Album">
          <select multiple className={fieldInputClass} {...register("albums")}>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {tags.length > 0 && (
        <Field label="Taggar">
          <select multiple className={fieldInputClass} {...register("tags")}>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Hör till projekt (valfritt)" error={errors.venture}>
        <select className={fieldInputClass} {...register("venture")}>
          <option value="">Allmän bild, inget projekt</option>
          {ventures.map((venture) => (
            <option key={venture.id} value={venture.id}>
              {venture.name}
            </option>
          ))}
        </select>
      </Field>

      {hasVenture && (
        <Field label="Skede" error={errors.stage}>
          <select className={fieldInputClass} {...register("stage")}>
            <option value="">Inget</option>
            <option value="before">Före</option>
            <option value="during">Under</option>
            <option value="after">Efter</option>
          </select>
        </Field>
      )}

      {photoAlbums.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Omslagsbild för album
          <div className="flex flex-wrap gap-2">
            {photoAlbums.map((album) => (
              <Button
                key={album.id}
                type="button"
                variant="secondary"
                size="sm"
                disabled={album.cover === photo.id}
                onClick={() => onSetCover(album)}
              >
                {album.cover === photo.id ? `${album.name} (omslag)` : album.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <FormRootError error={errors.root} />
      <div className="mt-2 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={onDelete}>
          {deleting ? "Tar bort..." : "Ta bort"}
        </Button>
        <FormActions isSubmitting={isSubmitting} className="flex" />
      </div>
    </form>
  )
}
