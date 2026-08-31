"use client"

import { usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createVentureTask, updateVentureTask } from "../actions/venture-task"
import { ventureTaskFormSchema, type VentureTaskFormValues } from "../lib/schemas"
import { Field, fieldInputClass } from "../components/form/Field"
import { useSubmitAction } from "../components/form/useSubmitAction"
import { FormActions, FormRootError } from "../components/form/FormFeedback"
import { useDrawerClose } from "../components/ui/Drawer"
import type { VentureTask } from "../lib/dal"
import { ventureTaskStatus } from "./venture-task-status"

const STATUS_OPTIONS = [
  { value: "not_started", label: "Ej påbörjad" },
  { value: "in_progress", label: "Under arbete" },
  { value: "done", label: "Klar" },
] as const

const VentureTaskForm = ({ venture, task }: { venture: string; task?: VentureTask }) => {
  const pathname = usePathname()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VentureTaskFormValues>({
    resolver: zodResolver(ventureTaskFormSchema),
    defaultValues: {
      name: task?.name ?? "",
      description: task?.description ?? "",
      status: task ? ventureTaskStatus(task) : "not_started",
    },
  })
  const submit = useSubmitAction(setError)
  const closeDrawer = useDrawerClose()

  const onSubmit = handleSubmit((data) =>
    submit(
      () => (task ? updateVentureTask(task.id, data, pathname) : createVentureTask(venture, data, pathname)),
      closeDrawer
    )
  )

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Namn" error={errors.name}>
        <input type="text" className={fieldInputClass} {...register("name")} />
      </Field>

      <Field label="Beskrivning" error={errors.description}>
        <textarea className={fieldInputClass} {...register("description")} />
      </Field>

      <Field label="Status" error={errors.status}>
        <select className={fieldInputClass} {...register("status")}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} />
    </form>
  )
}

export default VentureTaskForm
