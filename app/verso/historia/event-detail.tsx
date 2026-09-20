"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createHistoryEvent, deleteHistoryEvent, updateHistoryEvent } from "@/app/actions/history"
import { historyEventFormSchema, type HistoryEventFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { ChipSelect } from "@/app/components/form/ChipSelect"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { Button } from "@/app/components/ui/Button"
import { useDrawerClose } from "@/app/components/ui/Drawer"
import { formatHistoricalDate } from "@/app/lib/history-date"
import type { HistoryEvent, Person, Photo } from "@/app/lib/dal"

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

/** Create (no `event`) or edit a history event. `onDone` runs after save, cancel or delete. */
export function EventForm({
  event,
  people,
  photos,
  onDone,
}: {
  event?: HistoryEvent
  people: Person[]
  photos: Photo[]
  onDone: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<HistoryEventFormValues>({
    resolver: zodResolver(historyEventFormSchema),
    defaultValues: {
      title: event?.title ?? "",
      description: event?.description ?? "",
      date_start: event?.date_start?.slice(0, 10) ?? "",
      date_end: event?.date_end?.slice(0, 10) ?? "",
      date_precision: event?.date_precision ?? "year",
      place: event?.place ?? "",
      source: event?.source ?? "",
      transcript: event?.transcript ?? "",
      people: (event?.people ?? []).map(String),
      photos: (event?.photos ?? []).map(String),
    },
  })
  const submit = useSubmitAction(setError)

  const onSubmit = handleSubmit((data) =>
    submit(() => (event ? updateHistoryEvent(event.id, data) : createHistoryEvent(data)), onDone)
  )

  async function onDelete() {
    if (!event || !window.confirm("Ta bort händelsen?")) return
    setDeleting(true)
    const result = await deleteHistoryEvent(event.id)
    setDeleting(false)
    if (result?.error) {
      setError("root", { message: result.error })
      return
    }
    onDone()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Section title="När och var">
        <Field label="Rubrik" error={errors.title}>
          <input type="text" className={fieldInputClass} {...register("title")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum" error={errors.date_start}>
            <input type="date" className={fieldInputClass} {...register("date_start")} />
          </Field>
          <Field label="Slutdatum (valfritt)" error={errors.date_end}>
            <input type="date" className={fieldInputClass} {...register("date_end")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hur säkert" error={errors.date_precision}>
            <select className={fieldInputClass} {...register("date_precision")}>
              <option value="day">Exakt dag</option>
              <option value="month">Månad</option>
              <option value="year">År</option>
              <option value="decade">Årtionde</option>
              <option value="circa">Ungefär</option>
            </select>
          </Field>
          <Field label="Plats" error={errors.place}>
            <input type="text" className={fieldInputClass} {...register("place")} />
          </Field>
        </div>
      </Section>

      <Section title="Innehåll">
        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={4} className={fieldInputClass} {...register("description")} />
        </Field>
        <Field label="Utskrift (t.ex. intervju)" error={errors.transcript}>
          <textarea rows={10} className={fieldInputClass} {...register("transcript")} />
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
                emptyLabel="Inga personer ännu. Lägg till dem under Personer."
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Bilder och dokument
          <Controller
            control={control}
            name="photos"
            render={({ field }) => (
              <ChipSelect
                options={photos.map((photo) => ({ id: String(photo.id), label: photo.title || "Utan titel" }))}
                value={field.value}
                onChange={field.onChange}
                emptyLabel="Inga historiska bilder ännu."
              />
            )}
          />
        </div>
      </Section>

      <FormRootError error={errors.root} />
      <div className="flex items-center justify-between">
        {event ? (
          <Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={onDelete}>
            {deleting ? "Tar bort..." : "Ta bort"}
          </Button>
        ) : (
          <span />
        )}
        <FormActions isSubmitting={isSubmitting} onCancel={onDone} className="flex gap-2.5" />
      </div>
    </form>
  )
}

/** Form for a new event, shown inside a drawer. */
export function NewEventForm({ people, photos }: { people: Person[]; photos: Photo[] }) {
  const closeDrawer = useDrawerClose()
  return <EventForm people={people} photos={photos} onDone={closeDrawer} />
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

/** Read view of an event with an edit toggle. */
export function EventDetail({
  event,
  people,
  photos,
}: {
  event: HistoryEvent
  people: Person[]
  photos: Photo[]
}) {
  const [editing, setEditing] = useState(false)
  const closeDrawer = useDrawerClose()

  if (editing) {
    return <EventForm event={event} people={people} photos={photos} onDone={() => setEditing(false)} />
  }

  const when = formatHistoricalDate(event.date_start, event.date_precision)
  const until = event.date_end ? ` – ${formatHistoricalDate(event.date_end, event.date_precision)}` : ""
  const named = people.filter((person) => event.people.map(String).includes(String(person.id)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="m-0 font-display text-xl font-semibold text-text">{event.title}</h3>
          <span className="text-sm text-text-muted">
            {when}
            {until}
            {event.place && ` · ${event.place}`}
          </span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={closeDrawer}>
            Stäng
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Redigera
          </Button>
        </div>
      </div>

      {event.description && <p className="m-0 whitespace-pre-wrap text-sm text-text">{event.description}</p>}
      <Fact label="Källa">{event.source}</Fact>

      {named.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-faint">Personer</span>
          <div className="flex flex-wrap gap-2">
            {named.map((person) => (
              <span key={person.id} className="rounded-full border border-border px-3 py-1 text-xs text-text">
                {person.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {event.transcript && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-faint">Utskrift</span>
          <p className="m-0 whitespace-pre-wrap rounded-lg bg-accent-wash p-3 text-sm text-text">
            {event.transcript}
          </p>
        </div>
      )}
    </div>
  )
}
