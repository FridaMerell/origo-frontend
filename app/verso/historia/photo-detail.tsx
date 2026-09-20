"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { usePathname } from "next/navigation"
import { zodResolver } from "@/app/components/form/zodResolver"
import { deletePhoto, updatePhoto } from "@/app/actions/photo"
import { photoFormSchema, type PhotoFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { ChipSelect } from "@/app/components/form/ChipSelect"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { Button } from "@/app/components/ui/Button"
import { useDrawerClose } from "@/app/components/ui/Drawer"
import { fileProxyUrl } from "@/app/lib/files"
import { formatHistoricalDate } from "@/app/lib/history-date"
import type { Album, Person, Photo } from "@/app/lib/dal"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="m-0 border-b border-border pb-1 text-xs font-semibold uppercase tracking-wide text-text-faint">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-text-faint">{label}</span>
      <span className="text-sm text-text">{children}</span>
    </div>
  )
}

function PhotoRead({
  photo,
  albums,
  people,
  onEdit,
}: {
  photo: Photo
  albums: Album[]
  people: Person[]
  onEdit: () => void
}) {
  const pathname = usePathname()
  const closeDrawer = useDrawerClose()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const depicted = people.filter((person) => (photo.people ?? []).map(String).includes(String(person.id)))
  const inAlbums = albums.filter((album) => photo.albums.map(String).includes(String(album.id)))

  async function onDelete() {
    if (!window.confirm("Ta bort dokumentet?")) return
    setDeleting(true)
    const result = await deletePhoto(photo.id, pathname)
    setDeleting(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    closeDrawer()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="m-0 font-display text-xl font-semibold text-text">{photo.title || "Utan titel"}</h3>
          <span className="text-sm text-text-muted">
            {formatHistoricalDate(photo.taken_at, photo.date_precision)}
            {photo.place && ` · ${photo.place}`}
          </span>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          Redigera
        </Button>
      </div>

      {photo.description && <p className="m-0 whitespace-pre-wrap text-sm text-text">{photo.description}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Fact label="Källa">{photo.source}</Fact>
        <Fact label="Fotograf / rättigheter">{photo.credit}</Fact>
        <Fact label="Album">{inAlbums.map((a) => a.name).join(", ")}</Fact>
      </div>

      {depicted.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-faint">Personer</span>
          <div className="flex flex-wrap gap-2">
            {depicted.map((person) => (
              <span key={person.id} className="rounded-full border border-border px-3 py-1 text-xs text-text">
                {person.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {photo.transcription && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-faint">Transkribering</span>
          <p className="m-0 whitespace-pre-wrap rounded-lg bg-accent-wash p-3 font-body text-sm text-text">
            {photo.transcription}
          </p>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div>
        <Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={onDelete}>
          {deleting ? "Tar bort..." : "Ta bort"}
        </Button>
      </div>
    </div>
  )
}

function PhotoEdit({
  photo,
  people,
  onCancel,
}: {
  photo: Photo
  people: Person[]
  onCancel: () => void
}) {
  const pathname = usePathname()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PhotoFormValues>({
    resolver: zodResolver(photoFormSchema),
    // Fields not shown here (project, stage, albums, tags) keep their saved values.
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

  const onSubmit = handleSubmit((data) => submit(() => updatePhoto(photo.id, data, pathname), onCancel))

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Section title="När och var">
        <Field label="Titel" error={errors.title}>
          <input type="text" className={fieldInputClass} {...register("title")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum" error={errors.taken_at}>
            <input type="date" className={fieldInputClass} {...register("taken_at")} />
          </Field>
          <Field label="Hur säkert" error={errors.date_precision}>
            <select className={fieldInputClass} {...register("date_precision")}>
              <option value="day">Exakt dag</option>
              <option value="month">Månad</option>
              <option value="year">År</option>
              <option value="decade">Årtionde</option>
              <option value="circa">Ungefär</option>
            </select>
          </Field>
        </div>
        <Field label="Plats" error={errors.place}>
          <input type="text" className={fieldInputClass} {...register("place")} />
        </Field>
      </Section>

      <Section title="Innehåll">
        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={3} className={fieldInputClass} {...register("description")} />
        </Field>
        <Field label="Transkribering" error={errors.transcription}>
          <textarea rows={8} className={fieldInputClass} {...register("transcription")} />
        </Field>
      </Section>

      <Section title="Källa och personer">
        <Field label="Källa" error={errors.source}>
          <input type="text" className={fieldInputClass} {...register("source")} />
        </Field>
        <Field label="Fotograf / rättigheter" error={errors.credit}>
          <input type="text" className={fieldInputClass} {...register("credit")} />
        </Field>
        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Personer på bilden
          <Controller
            control={control}
            name="people"
            render={({ field }) => (
              <ChipSelect
                options={people.map((person) => ({ id: String(person.id), label: person.name }))}
                value={field.value ?? []}
                onChange={field.onChange}
                emptyLabel="Inga personer ännu."
              />
            )}
          />
        </div>
      </Section>

      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  )
}

/** Wide document view: the image beside the details, transcription below. Read first, edit on demand. */
export function PhotoDetail({
  photo,
  albums,
  people,
}: {
  photo: Photo
  albums: Album[]
  people: Person[]
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="md:sticky md:top-0 md:self-start">
        {/* The bucket is private, so files are streamed through /api/files. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileProxyUrl(photo.url)}
          alt={photo.title}
          className="max-h-[70vh] w-full rounded-lg bg-accent-wash object-contain"
        />
      </div>
      {editing ? (
        <PhotoEdit photo={photo} people={people} onCancel={() => setEditing(false)} />
      ) : (
        <PhotoRead photo={photo} albums={albums} people={people} onEdit={() => setEditing(true)} />
      )}
    </div>
  )
}
