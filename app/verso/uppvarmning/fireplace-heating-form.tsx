"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { registerFireplaceHeating } from "./_actions/residential-heating"
import { fireplaceHeatingFormSchema, type FireplaceHeatingFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useDrawerClose } from "@/app/components/ui/Drawer"

/** The current local time in the `datetime-local` input format (YYYY-MM-DDTHH:mm). */
function localNow() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

/** Registers a fireplace heating on the connection's device. */
export function FireplaceHeatingForm({ connection }: { connection: string }) {
  const close = useDrawerClose()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FireplaceHeatingFormValues>({
    resolver: zodResolver(fireplaceHeatingFormSchema),
    defaultValues: { start_time: localNow() },
  })
  const submit = useSubmitAction(setError)

  // The browser knows the user's timezone; the server does not, so the instant is built here.
  const onSubmit = handleSubmit((data) =>
    submit(
      () => registerFireplaceHeating(connection, { start_time: new Date(data.start_time).toISOString() }),
      close
    )
  )

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Tid" error={errors.start_time}>
        <input type="datetime-local" className={fieldInputClass} {...register("start_time")} />
      </Field>

      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} submitLabel="Spara" pendingLabel="Sparar..." />
    </form>
  )
}
