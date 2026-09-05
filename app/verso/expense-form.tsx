"use client"

import { usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createExpense } from "../actions/expense"
import { expenseFormSchema, type ExpenseFormValues } from "../lib/schemas"
import { Field, fieldInputClass } from "../components/form/Field"
import { useSubmitAction } from "../components/form/useSubmitAction"
import { FormActions, FormRootError } from "../components/form/FormFeedback"
import { useDrawerClose } from "../components/ui/Drawer"

const ExpenseForm = ({ venture }: { venture?: string }) => {
  const pathname = usePathname()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: { description: "", amount: "", date_incurred: "" },
  })
  const submit = useSubmitAction(setError)
  const closeDrawer = useDrawerClose()

  const onSubmit = handleSubmit((data) => submit(() => createExpense(venture, data, pathname), closeDrawer))

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Beskrivning (valfritt)" error={errors.description}>
        <input type="text" className={fieldInputClass} {...register("description")} />
      </Field>

      <Field label="Belopp" error={errors.amount}>
        <input type="text" inputMode="decimal" className={fieldInputClass} {...register("amount")} />
      </Field>

      <Field label="Datum" error={errors.date_incurred}>
        <input type="date" className={fieldInputClass} {...register("date_incurred")} />
      </Field>

      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} />
    </form>
  )
}

export default ExpenseForm
