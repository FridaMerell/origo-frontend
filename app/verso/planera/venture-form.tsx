"use client";

import { usePathname } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVenture } from "@/app/actions/venture";
import { ventureFormSchema, type VentureFormValues } from "@/app/lib/schemas";
import { Field, fieldInputClass } from "@/app/components/form/Field";
import { useSubmitAction } from "@/app/components/form/useSubmitAction";
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback";

export function VentureForm({ onSuccess }: { onSuccess?: () => void }) {
  const pathname = usePathname();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VentureFormValues>({
    resolver: zodResolver(ventureFormSchema),
    defaultValues: { name: "", description: "", priority: 3, budget: 0 },
  });
  const priority = useWatch({ control, name: "priority" });
  const submit = useSubmitAction(setError);

  const onSubmit = handleSubmit((data) => submit(() => createVenture(data, pathname), onSuccess));

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

      <FormRootError error={errors.root} />
      <FormActions isSubmitting={isSubmitting} />
    </form>
  );
}
