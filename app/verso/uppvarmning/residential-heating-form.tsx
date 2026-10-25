"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { saveResidentialHeating } from "./_actions/residential-heating"
import { residentialHeatingFormSchema, type ResidentialHeatingFormValues } from "@/app/lib/schemas"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { useSubmitAction } from "@/app/components/form/useSubmitAction"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useDrawerClose } from "@/app/components/ui/Drawer"
import type { ResidentialHeating } from "@/app/lib/dal"

/** Connects the selected house to ResidentialHeatingScheduler with a user token from that app. */
export function ResidentialHeatingForm({ connection }: { connection: ResidentialHeating | null }) {
  const close = useDrawerClose()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResidentialHeatingFormValues>({
    resolver: zodResolver(residentialHeatingFormSchema),
    defaultValues: { base_url: connection?.base_url ?? "", token: "", device: connection?.device },
  })
  const submit = useSubmitAction(setError)

  const onSubmit = handleSubmit((data) =>
    submit(() => saveResidentialHeating(connection?.id ?? null, data), close)
  )

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Adress" error={errors.base_url}>
        <input type="url" className={fieldInputClass} placeholder="https://" {...register("base_url")} />
      </Field>

      <Field label={connection ? "Token (lämna tomt för att behålla)" : "Token"} error={errors.token}>
        <input type="password" autoComplete="off" className={fieldInputClass} {...register("token")} />
      </Field>

      <Field label="Device" error={errors.device}>
        <input type="number" min={1} step={1} className={fieldInputClass} {...register("device")} />
      </Field>

      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} submitLabel="Spara" pendingLabel="Sparar..." />
    </form>
  )
}
