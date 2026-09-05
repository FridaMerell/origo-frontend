"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@/app/components/form/zodResolver";
import { createUpdate, updateUpdate } from "@/app/actions/flux/updates";
import { fluxUpdateFormSchema, type FluxUpdateFormValues } from "@/app/lib/schemas";
import { FileUpload } from "@/app/components/ui/FileUpload";
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback";
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles";
import type { FluxUpdate } from "@/app/lib/dal";
import { useFluxUpdateActions } from "@/app/flux/_state/flux-context";

export function UpdateForm({
  update,
  defaultProject,
  defaultMilestone,
  defaultTask,
  onDone,
}: {
  update?: FluxUpdate;
  defaultProject: number;
  defaultMilestone: number | null;
  defaultTask: number | null;
  onDone?: () => void;
}) {
  const uploadedFiles = useUploadedFiles(update?.files, update?.id ?? null);
  const { addUpdate, replaceUpdate } = useFluxUpdateActions();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxUpdateFormValues>({
    resolver: zodResolver(fluxUpdateFormSchema),
    defaultValues: { content: update?.content ?? "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = update
      ? await updateUpdate(update.id, data, uploadedFiles.urls)
      : await createUpdate(defaultProject, defaultMilestone, defaultTask, data, uploadedFiles.urls);
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Uppdateringen kunde inte sparas." });
      return;
    }
    if (update) {
      replaceUpdate(result.data);
      onDone?.();
    } else {
      addUpdate(result.data);
      reset({ content: "" });
      uploadedFiles.clear();
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
      <textarea
        rows={2}
        placeholder="Skriv en uppdatering..."
        className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-sm text-text"
        {...register("content")}
      />

      <FileUpload folder="flux" files={uploadedFiles.files} onChange={uploadedFiles.setFiles} />

      {errors.content && <p className="text-sm text-danger">{errors.content.message}</p>}
      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} submitLabel={update ? "Spara" : "Lägg till uppdatering"} onCancel={update ? onDone : undefined} className="flex items-center justify-end gap-2.5" />
    </form>
  );
}
