"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@/app/components/form/zodResolver"
import { createMilestone, updateMilestone } from "@/app/actions/flux/milestones"
import { fluxMilestoneFormSchema, type FluxMilestoneFormValues } from "@/app/lib/schemas"
import { Drawer } from "@/app/components/ui/Drawer"
import { Field, fieldInputClass } from "@/app/components/form/Field"
import { FileUpload } from "@/app/components/ui/FileUpload"
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback"
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles"
import { useFluxMilestoneActions } from "@/app/flux/_state/flux-context"
import type { FluxMilestone, FluxMilestoneStatus } from "@/app/lib/dal"

const STATUS_OPTIONS: { value: FluxMilestoneStatus; label: string }[] = [
  { value: "not_started", label: "Ej påbörjad" },
  { value: "in_progress", label: "Pågående" },
  { value: "done", label: "Klar" },
]

export function MilestoneFormDrawer({
  open,
  onClose,
  projectId,
  milestone,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  milestone?: FluxMilestone
}) {
  const { addMilestone, replaceMilestone } = useFluxMilestoneActions()
  const uploadedFiles = useUploadedFiles(milestone?.files, milestone?.id ?? null)
  const {
    register,
    handleSubmit, reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxMilestoneFormValues>({
    resolver: zodResolver(fluxMilestoneFormSchema),
    defaultValues: {
      title: milestone?.title ?? "",
      description: milestone?.description ?? "",
      status: milestone?.status ?? "not_started",
      target_date: milestone?.target_date ?? null,
    },
  })
  useEffect(() => {
    if (!open) return
    reset({
      title: milestone?.title ?? "",
      description: milestone?.description ?? "",
      status: milestone?.status ?? "not_started",
      target_date: milestone?.target_date ?? null,
    })
  }, [open, milestone, reset])

  const onSubmit = handleSubmit(async (data) => {
    const result = milestone
      ? await updateMilestone(milestone.id, data, uploadedFiles.urls)
      : await createMilestone(projectId, data, uploadedFiles.urls)
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Delmålet kunde inte sparas." })
      return
    }
    if (milestone) replaceMilestone(result.data)
    else addMilestone(result.data)
    onClose()
  })

  return (
    <Drawer
      title={milestone ? "Redigera delmål" : "Nytt delmål"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <Field label="Namn" error={errors.title}>
          <input type="text" placeholder="t.ex. Betasläpp" className={fieldInputClass} {...register("title")} />
        </Field>

        <Field label="Beskrivning" error={errors.description}>
          <textarea rows={3} className={fieldInputClass} {...register("description")} />
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

        <Field label="Deadline" error={errors.target_date}>
          <input type="date" className={fieldInputClass} {...register("target_date")} />
        </Field>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Filer
          <FileUpload folder="flux" files={uploadedFiles.files} onChange={uploadedFiles.setFiles} />
        </div>

        <FormRootError error={errors.root} />
        <FormActions isSubmitting={isSubmitting} submitLabel={milestone ? "Spara" : "Skapa delmål"} onCancel={onClose} size="md" className="flex items-center justify-end gap-2.5 pt-2" />
      </form>
    </Drawer>
  )
}
