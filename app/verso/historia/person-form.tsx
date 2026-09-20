"use client"

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react"
import { useForm } from "react-hook-form"
import { formatHistoricalDate } from "@/app/lib/history-date"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createPerson, deletePerson, updatePerson } from "@/app/actions/history"
import { personFormSchema, type PersonFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { Button } from "@/app/components/ui/Button"
import type { Person } from "@/app/lib/dal"

const PrecisionSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>(
  function PrecisionSelect(props, ref) {
    return (
      <select ref={ref} className={fieldInputClass} {...props}>
        <option value="day">Exakt dag</option>
        <option value="month">Månad</option>
        <option value="year">År</option>
        <option value="decade">Årtionde</option>
        <option value="circa">Ungefär</option>
      </select>
    )
  }
)

/** "1923 – 1987", "1923 –" or "? – 1987"; empty when neither date is known. */
export function lifespan(person: Person): string {
  if (!person.birth_date && !person.death_date) return ""
  const born = person.birth_date ? formatHistoricalDate(person.birth_date, person.birth_date_precision) : "?"
  const died = person.death_date ? formatHistoricalDate(person.death_date, person.death_date_precision) : ""
  return `${born} – ${died}`
}

/** Create (no `person`) or edit a person. `onDone` runs after save, cancel or delete. */
export function PersonForm({
  person,
  onDone,
  onDeleted,
}: {
  person?: Person
  onDone: (id?: string) => void
  onDeleted?: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      name: person?.name ?? "",
      birth_date: person?.birth_date?.slice(0, 10) ?? "",
      birth_date_precision: person?.birth_date_precision ?? "year",
      death_date: person?.death_date?.slice(0, 10) ?? "",
      death_date_precision: person?.death_date_precision ?? "year",
      relation: person?.relation ?? "",
      notes: person?.notes ?? "",
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    const result = person ? await updatePerson(person.id, data) : await createPerson(data)
    if (result?.error) {
      setError("root", { message: result.error })
      return
    }
    onDone(result?.id ?? person?.id)
  })

  async function onDelete() {
    if (!person || !window.confirm("Ta bort personen?")) return
    setDeleting(true)
    const result = await deletePerson(person.id)
    setDeleting(false)
    if (result?.error) {
      setError("root", { message: result.error })
      return
    }
    onDeleted?.()
    onDone()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Namn" error={errors.name}>
        <input type="text" className={fieldInputClass} {...register("name")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Född" error={errors.birth_date}>
          <input type="date" className={fieldInputClass} {...register("birth_date")} />
        </Field>
        <Field label="Hur säkert" error={errors.birth_date_precision}>
          <PrecisionSelect {...register("birth_date_precision")} />
        </Field>
        <Field label="Död" error={errors.death_date}>
          <input type="date" className={fieldInputClass} {...register("death_date")} />
        </Field>
        <Field label="Hur säkert" error={errors.death_date_precision}>
          <PrecisionSelect {...register("death_date_precision")} />
        </Field>
      </div>
      <p className="m-0 text-xs text-text-faint">
        Vet du bara året: välj vilken dag som helst det året och &quot;År&quot; som säkerhet.
      </p>
      <Field label="Relation till huset" error={errors.relation}>
        <input
          type="text"
          placeholder="t.ex. tidigare ägare, släkting, intervjuad"
          className={fieldInputClass}
          {...register("relation")}
        />
      </Field>
      <Field label="Anteckningar" error={errors.notes}>
        <textarea rows={5} className={fieldInputClass} {...register("notes")} />
      </Field>
      <FormRootError error={errors.root} />
      <div className="flex items-center justify-between">
        {person ? (
          <Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={onDelete}>
            {deleting ? "Tar bort..." : "Ta bort"}
          </Button>
        ) : (
          <span />
        )}
        <FormActions isSubmitting={isSubmitting} onCancel={() => onDone()} className="flex gap-2.5" />
      </div>
    </form>
  )
}
