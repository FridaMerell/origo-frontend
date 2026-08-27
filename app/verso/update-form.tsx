"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { VersoUpdate } from "../lib/dal"
import { useVentureData } from "../lib/venture-context"
import { createVersoUpdate, updateVersoUpdate } from "../actions/verso-update"
import { versoUpdateFormSchema, type VersoUpdateFormValues } from "../lib/schemas"
import { Field, fieldInputClass } from "../components/form/Field"
import { FileUpload } from "../components/ui/FileUpload"
import { useSubmitAction } from "../components/form/useSubmitAction"
import { FormActions, FormRootError } from "../components/form/FormFeedback"
import { useUploadedFiles } from "../components/form/useUploadedFiles"
import { useDrawerClose } from "../components/ui/Drawer"
import {
  VentureTaskLinkPicker,
  resolveVentureTaskLink,
  type VentureTaskLinkValue,
} from "./ui/VentureTaskLinkPicker"

const UpdateForm = ({
  update,
  defaultVenture,
  defaultTask,
}: {
  update?: VersoUpdate
  defaultVenture?: string
  defaultTask?: string
}) => {
  const pathname = usePathname()
  const { ventureTasks } = useVentureData()
  const uploadedFiles = useUploadedFiles(update?.files, update?.id ?? null)
  const [link, setLink] = useState<VentureTaskLinkValue>({
    linkType: update?.task || defaultTask ? "task" : "venture",
    linkId: update?.task ?? update?.venture ?? defaultTask ?? defaultVenture ?? null,
  })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Pick<VersoUpdateFormValues, "title" | "content">>({
    resolver: zodResolver(versoUpdateFormSchema.pick({ title: true, content: true })),
    defaultValues: { title: update?.title ?? "", content: update?.content ?? "" },
  })
  const submit = useSubmitAction(setError)
  const closeDrawer = useDrawerClose()

  const onSubmit = handleSubmit((data) => {
    const { venture, task } = resolveVentureTaskLink(link, ventureTasks)
    const payload = { ...data, venture, task }
    return submit(() =>
      update
        ? updateVersoUpdate(update.id, payload, uploadedFiles.urls, pathname)
        : createVersoUpdate(payload, uploadedFiles.urls, pathname),
      closeDrawer
    )
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Rubrik" error={errors.title}>
        <input type="text" className={fieldInputClass} {...register("title")} />
      </Field>
      <Field label="Uppdatering" error={errors.content}>
        <textarea className={fieldInputClass} {...register("content")} />
      </Field>

      <VentureTaskLinkPicker value={link} onChange={setLink} />

      <div className="flex flex-col gap-1 text-sm text-text-muted">
        Bilagor
        <FileUpload folder="verso" files={uploadedFiles.files} onChange={uploadedFiles.setFiles} />
      </div>

      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} />
    </form>
  )
}

export default UpdateForm
