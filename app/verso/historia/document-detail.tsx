"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { deleteDocument, updateDocument } from "@/app/actions/history"
import { documentFormSchema, type DocumentFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { ChipSelect } from "@/app/components/form/ChipSelect"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { Button } from "@/app/components/ui/Button"
import { useDrawerClose } from "@/app/components/ui/Drawer"
import { fileProxyUrl } from "@/app/lib/files"
import { formatHistoricalDate } from "@/app/lib/history-date"
import type { HouseDocument, Person, PhotoTag } from "@/app/lib/dal"

/** Short label for a document's file type, e.g. "PDF" or "Bild". */
export function documentTypeLabel(doc: Pick<HouseDocument, "content_type" | "file_name">): string {
  if (doc.content_type === "application/pdf") return "PDF"
  if (doc.content_type.startsWith("image/")) return "Bild"
  const ext = doc.file_name.split(".").pop()
  return ext && ext !== doc.file_name ? ext.toUpperCase() : "Fil"
}

function DocumentPreview({ doc }: { doc: HouseDocument }) {
  const src = fileProxyUrl(doc.url)

  if (doc.content_type.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={doc.title} className="max-h-[70vh] w-full rounded-lg bg-accent-wash object-contain" />
    )
  }
  if (doc.content_type === "application/pdf") {
    return <iframe src={src} title={doc.title} className="h-[70vh] w-full rounded-lg border border-border" />
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-text-muted">
      Ingen förhandsvisning för den här filtypen.
      <a href={src} target="_blank" rel="noopener noreferrer" className="text-accent underline">
        Öppna {doc.file_name || "filen"}
      </a>
    </div>
  )
}

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

function DocumentEdit({
  doc,
  people,
  tags,
  onCancel,
}: {
  doc: HouseDocument
  people: Person[]
  tags: PhotoTag[]
  onCancel: () => void
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: doc.title,
      description: doc.description ?? "",
      document_date: doc.document_date?.slice(0, 10) ?? "",
      date_precision: doc.date_precision ?? "day",
      source: doc.source ?? "",
      transcription: doc.transcription ?? "",
      venture: doc.venture ?? "",
      tags: doc.tags.map(String),
      people: doc.people.map(String),
    },
  })
  const submit = useSubmitAction(setError)
  const onSubmit = handleSubmit((data) => submit(() => updateDocument(doc.id, data), onCancel))

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Section title="När och var">
        <Field label="Titel" error={errors.title}>
          <input type="text" className={fieldInputClass} {...register("title")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum" error={errors.document_date}>
            <input type="date" className={fieldInputClass} {...register("document_date")} />
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
      </Section>

      <Section title="Innehåll">
        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={3} className={fieldInputClass} {...register("description")} />
        </Field>
        <Field label="Utskrift" error={errors.transcription}>
          <textarea rows={8} className={fieldInputClass} {...register("transcription")} />
        </Field>
      </Section>

      <Section title="Källa och kopplingar">
        <Field label="Källa" error={errors.source}>
          <input type="text" className={fieldInputClass} {...register("source")} />
        </Field>
        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Personer
          <Controller
            control={control}
            name="people"
            render={({ field }) => (
              <ChipSelect
                options={people.map((person) => ({ id: String(person.id), label: person.name }))}
                value={field.value}
                onChange={field.onChange}
                emptyLabel="Inga personer ännu."
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Taggar
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <ChipSelect
                options={tags.map((tag) => ({ id: String(tag.id), label: tag.name }))}
                value={field.value}
                onChange={field.onChange}
                emptyLabel="Inga taggar ännu."
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

function DocumentRead({
  doc,
  people,
  onEdit,
}: {
  doc: HouseDocument
  people: Person[]
  onEdit: () => void
}) {
  const closeDrawer = useDrawerClose()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const named = people.filter((person) => doc.people.map(String).includes(String(person.id)))

  async function onDelete() {
    if (!window.confirm("Ta bort dokumentet?")) return
    setDeleting(true)
    const result = await deleteDocument(doc.id)
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
          <h3 className="m-0 font-display text-xl font-semibold text-text">{doc.title}</h3>
          <span className="text-sm text-text-muted">
            {formatHistoricalDate(doc.document_date, doc.date_precision)} · {documentTypeLabel(doc)}
          </span>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          Redigera
        </Button>
      </div>

      {doc.description && <p className="m-0 whitespace-pre-wrap text-sm text-text">{doc.description}</p>}
      {doc.source && (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-text-faint">Källa</span>
          <span className="text-sm text-text">{doc.source}</span>
        </div>
      )}

      {named.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {named.map((person) => (
            <span key={person.id} className="rounded-full border border-border px-3 py-1 text-xs text-text">
              {person.name}
            </span>
          ))}
        </div>
      )}

      {doc.transcription && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-faint">Utskrift</span>
          <p className="m-0 whitespace-pre-wrap rounded-lg bg-accent-wash p-3 text-sm text-text">
            {doc.transcription}
          </p>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <a
          href={fileProxyUrl(doc.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent underline"
        >
          Öppna filen
        </a>
        <Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={onDelete}>
          {deleting ? "Tar bort..." : "Ta bort"}
        </Button>
      </div>
    </div>
  )
}

/** Wide document view: preview beside the details. Read first, edit on demand. */
export function DocumentDetail({
  doc,
  people,
  tags,
}: {
  doc: HouseDocument
  people: Person[]
  tags: PhotoTag[]
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="md:sticky md:top-0 md:self-start">
        <DocumentPreview doc={doc} />
      </div>
      {editing ? (
        <DocumentEdit doc={doc} people={people} tags={tags} onCancel={() => setEditing(false)} />
      ) : (
        <DocumentRead doc={doc} people={people} onEdit={() => setEditing(true)} />
      )}
    </div>
  )
}
