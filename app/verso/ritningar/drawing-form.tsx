"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createDrawing } from "@/app/actions/drawing"
import { drawingFormSchema, type DrawingFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useVentureData } from "@/app/verso/_state/verso-context"

/** Creates a drawing and opens it in the editor (the action redirects). */
export function DrawingForm({ defaultVenture }: { defaultVenture?: string }) {
  const { ventures } = useVentureData()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DrawingFormValues>({
    resolver: zodResolver(drawingFormSchema),
    defaultValues: { name: "", description: "", unit: "mm", venture: defaultVenture ?? "" },
  })
  const submit = useSubmitAction(setError)

  const onSubmit = handleSubmit((data) => submit(() => createDrawing(data)))

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Namn" error={errors.name}>
        <input type="text" className={fieldInputClass} {...register("name")} />
      </Field>

      <Field label="Beskrivning" error={errors.description}>
        <textarea className={fieldInputClass} {...register("description")} />
      </Field>

      <Field label="Enhet" error={errors.unit}>
        <select className={fieldInputClass} {...register("unit")}>
          <option value="mm">Millimeter (mm)</option>
          <option value="cm">Centimeter (cm)</option>
          <option value="m">Meter (m)</option>
        </select>
      </Field>

      <Field label="Projekt (valfritt)" error={errors.venture}>
        <select className={fieldInputClass} {...register("venture")}>
          <option value="">Inget projekt</option>
          {ventures.map((venture) => (
            <option key={venture.id} value={venture.id}>
              {venture.name}
            </option>
          ))}
        </select>
      </Field>

      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} submitLabel="Skapa" pendingLabel="Skapar..." />
    </form>
  )
}
