"use client";

import { usePathname } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateVenture } from "@/app/actions/venture";
import { ventureFormSchema, type VentureFormValues } from "@/app/lib/schemas";
import { Field, fieldInputClass } from "@/app/components/form/Field";
import { FileUpload } from "@/app/components/ui/FileUpload";
import { useSubmitAction } from "@/app/components/form/useSubmitAction";
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback";
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles";
import { useDrawerClose } from "@/app/components/ui/Drawer";
import type { Venture } from "@/app/lib/dal";

export function VentureEditForm({ venture }: { venture: Venture }) {
  const pathname = usePathname();
  const uploadedFiles = useUploadedFiles(venture.files, venture.id);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VentureFormValues>({
    resolver: zodResolver(ventureFormSchema),
    defaultValues: {
      name: venture.name,
      description: venture.description,
      priority: venture.priority,
      budget: venture.budget,
    },
  });
  const priority = useWatch({ control, name: "priority" });
  const submit = useSubmitAction(setError);
  const closeDrawer = useDrawerClose();

  const onSubmit = handleSubmit((data) =>
    submit(() => updateVenture(venture.id, data, uploadedFiles.urls, pathname), closeDrawer)
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Namn" error={errors.name}>
        <input type="text" className={fieldInputClass} {...register("name")} />
      </Field>

      <Field label="Beskrivning" error={errors.description}>
        <textarea className={fieldInputClass} {...register("description")} />
      </Field>

      <Field label={`Prioritet (${priority})`} error={errors.priority}>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          className="accent-accent"
          {...register("priority")}
        />
      </Field>

      <Field label="Budget" error={errors.budget}>
        <input type="text" inputMode="decimal" className={fieldInputClass} {...register("budget")} />
      </Field>

      <div className="flex flex-col gap-1 text-sm text-text-muted">
        Bilagor
        <FileUpload folder="verso" files={uploadedFiles.files} onChange={uploadedFiles.setFiles} />
      </div>

      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} />
    </form>
  );
}
