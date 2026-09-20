"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { usePathname } from "next/navigation"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createPhoto } from "@/app/actions/photo"
import { photoFormSchema, type PhotoFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useDrawerClose } from "@/app/components/ui/Drawer"
import { useVentureData } from "@/app/verso/_state/verso-context"
import { readImageInfo } from "@/app/lib/image-thumbnail"
import { inHistoryAlbum, withoutHistoryFields } from "@/app/verso/bilder/history-fields"
import type { Album, PhotoTag } from "@/app/lib/dal"

async function uploadToStorage(file: File): Promise<string> {
  const body = new FormData()
  body.set("file", file)
  body.set("folder", "verso")
  const response = await fetch("/api/upload", { method: "POST", body })
  if (!response.ok) throw new Error("Upload failed")
  const { url } = (await response.json()) as { url: string }
  return url
}

/** Uploads one or more images with a thumbnail each; the settings apply to every image. */
export function PhotoUploadForm({
  albums,
  tags,
  defaultVenture,
  defaultAlbums,
  requireAlbum = false,
  minimal = false,
  onUploaded,
}: {
  albums: Album[]
  tags: PhotoTag[]
  defaultVenture?: string
  defaultAlbums?: string[]
  /** Fail before uploading when no album is chosen (e.g. history, which is shown per album). */
  requireAlbum?: boolean
  /** Only files and albums; everything else is filled in afterwards. */
  minimal?: boolean
  /** Called with the ids of the photos that were created. */
  onUploaded?: (ids: string[]) => void
}) {
  const { ventures } = useVentureData()
  const pathname = usePathname()
  const closeDrawer = useDrawerClose()
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PhotoFormValues>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: { title: "", description: "", venture: defaultVenture ?? "", task: "", stage: "", albums: defaultAlbums ?? [], tags: [], date_precision: "day", place: "", source: "", transcription: "", credit: "", people: [], taken_at: "" },
  })
  const submit = useSubmitAction(setError)
  const hasVenture = Boolean(watch("venture"))
  const isHistory = inHistoryAlbum(watch("albums"), albums)

  const onSubmit = handleSubmit(async (rawData) => {
    // Before/during/after only makes sense for a project's progress photos.
    const staged = hasVenture ? rawData : { ...rawData, stage: "" as const }
    // History details are filled in on /historia, never here.
    const data = withoutHistoryFields(staged)
    const files = Array.from(inputRef.current?.files ?? [])
    if (files.length === 0) {
      setError("root", { message: "Välj minst en bild." })
      return
    }

    if (requireAlbum && data.albums.length === 0) {
      setError("root", { message: "Välj minst ett album." })
      return
    }

    let failed = 0
    const createdIds: string[] = []
    for (const [index, file] of files.entries()) {
      setProgress(`Laddar upp ${index + 1} av ${files.length}...`)
      try {
        const info = await readImageInfo(file)
        const [url, thumbnail_url] = await Promise.all([
          uploadToStorage(file),
          uploadToStorage(info.thumbnail),
        ])
        const ok = await submit(async () => {
          const result = await createPhoto(
            {
              url,
              thumbnail_url,
              width: info.width,
              height: info.height,
              // A history photo's date is set by hand later; the file's date is only when it was scanned.
              taken_at: isHistory ? undefined : new Date(file.lastModified).toISOString(),
            },
            data,
            pathname
          )
          if (result?.id) createdIds.push(result.id)
          return result
        })
        if (!ok) failed++
      } catch {
        failed++
      }
    }
    setProgress(null)
    if (createdIds.length > 0) onUploaded?.(createdIds)

    if (failed > 0) {
      setError("root", { message: `${failed} av ${files.length} bilder kunde inte laddas upp.` })
      return
    }
    closeDrawer()
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Bilder">
        <input ref={inputRef} type="file" accept="image/*" multiple className={fieldInputClass} />
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

      {!minimal && tags.length > 0 && (
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

      {!minimal && (
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
      )}

      {!minimal && hasVenture && (
        <Field label="Skede" error={errors.stage}>
          <select className={fieldInputClass} {...register("stage")}>
            <option value="">Inget</option>
            <option value="before">Före</option>
            <option value="during">Under</option>
            <option value="after">Efter</option>
          </select>
        </Field>
      )}

      {progress && <p className="text-sm text-text-muted">{progress}</p>}
      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} submitLabel="Ladda upp" pendingLabel="Laddar upp..." />
    </form>
  )
}
