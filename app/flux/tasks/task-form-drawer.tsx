"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@/app/components/form/zodResolver";
import { createTask, updateTask } from "@/app/actions/flux/tasks";
import { fluxTaskFormSchema, type FluxTaskFormValues } from "@/app/lib/schemas";
import { Drawer } from "@/app/components/ui/Drawer";
import { Field, fieldInputClass } from "@/app/components/form/Field";
import { FileUpload } from "@/app/components/ui/FileUpload";
import { FormActions, FormRootError } from "@/app/components/form/FormFeedback";
import { useUploadedFiles } from "@/app/components/form/useUploadedFiles";
import { UserMultiSelect } from "@/app/flux/user-multiselect";
import { useFluxMilestones, useFluxProjects, useFluxTaskActions, useFluxUsers, useSelectedFluxProject } from "@/app/flux/_state/flux-context";
import type { FluxTask, FluxTaskRecurrence, FluxTaskStatus } from "@/app/lib/dal";

const STATUS_OPTIONS: { value: FluxTaskStatus; label: string }[] = [
  { value: "not_started", label: "Ej påbörjad" },
  { value: "in_progress", label: "Pågående" },
  { value: "done", label: "Klar" },
];

const RECURRENCE_OPTIONS: { value: FluxTaskRecurrence; label: string }[] = [
  { value: "none", label: "Ingen" },
  { value: "daily", label: "Dagligen" },
  { value: "weekly", label: "Veckovis" },
  { value: "monthly", label: "Månadsvis" },
  { value: "yearly", label: "Årsvis" },
];

const PRIORITY_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Låg",
  medium: "Medel",
  high: "Hög",
};

export function TaskFormDrawer({
  open,
  onClose,
  task,
  defaultProjectId,
  defaultMilestoneId,
  defaultParentId,
}: {
  open: boolean;
  onClose: () => void;
  task?: FluxTask;
  defaultProjectId?: number;
  defaultMilestoneId?: number | null;
  defaultParentId?: number | null;
}) {
  const projects = useFluxProjects();
  const { addTask, replaceTask } = useFluxTaskActions();
  const { selectedProject } = useSelectedFluxProject();
  const milestones = useFluxMilestones();
  const users = Array.from(useFluxUsers().values());

  const uploadedFiles = useUploadedFiles(task?.files, task?.id ?? null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FluxTaskFormValues>({
    resolver: zodResolver(fluxTaskFormSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      project: task?.project ?? defaultProjectId ?? selectedProject?.id ?? projects[0]?.id ?? 0,
      milestone: task?.milestone ?? defaultMilestoneId ?? null,
      priority: task?.priority ?? "medium",
      status: task?.status ?? "not_started",
      due_date: task?.due_date ?? null,
      recurrence: task?.recurrence ?? "none",
      recurrence_interval: task?.recurrence_interval ?? 1,
      recurrence_end_date: task?.recurrence_end_date ?? null,
      assignees: task?.assignees ?? [],
    },
  });

  const projectId = useWatch({ control, name: "project" });
  const assignees = useWatch({ control, name: "assignees" });

  useEffect(() => {
    if (open) {
      reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        project: task?.project ?? defaultProjectId ?? selectedProject?.id ?? projects[0]?.id ?? 0,
        milestone: task?.milestone ?? defaultMilestoneId ?? null,
        priority: task?.priority ?? "medium",
        status: task?.status ?? "not_started",
        due_date: task?.due_date ?? null,
        recurrence: task?.recurrence ?? "none",
        recurrence_interval: task?.recurrence_interval ?? 1,
        recurrence_end_date: task?.recurrence_end_date ?? null,
        assignees: task?.assignees ?? [],
      });
      uploadedFiles.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- projects/selectedProject/uploadedFiles are read from context/props with unstable identities; the primitives below already capture every value that should trigger a reset
  }, [open, task?.id, defaultProjectId, defaultMilestoneId, selectedProject?.id, projects[0]?.id]);

  const availableMilestones = milestones.filter((milestone) => milestone.project === Number(projectId));

  const onSubmit = handleSubmit(async (data) => {
    const result = task
      ? await updateTask(task.id, data, uploadedFiles.urls)
      : await createTask(data, defaultParentId ?? null, uploadedFiles.urls);
    if (result?.error || !result?.data) {
      setError("root", { message: result?.error ?? "Uppgiften kunde inte sparas." });
      return;
    }
    if (task) replaceTask(result.data);
    else addTask(result.data);
    onClose();
  });

  return (
    <Drawer
      title={task ? "Redigera uppgift" : "Ny uppgift"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      panelClassName="max-w-4xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4.5">
        <Field label="Namn" error={errors.title}>
          <input
            type="text"
            placeholder="t.ex. Kalibrera IMU på rev-C kort"
            className={fieldInputClass}
            {...register("title")}
          />
        </Field>

        <Field label="Beskrivning" error={errors.description}>
          <textarea
            rows={3}
            placeholder="Vad behöver göras, och varför"
            className={fieldInputClass}
            {...register("description")}
          />
        </Field>

        <Field label="Projekt" error={errors.project}>
          <select className={fieldInputClass} {...register("project")}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Delmål" error={errors.milestone}>
          <select className={fieldInputClass} {...register("milestone")}>
            <option value="">Inget delmål</option>
            {availableMilestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-muted">Prioritet</span>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((priority) => (
              <label
                key={priority}
                className="flex-1 cursor-pointer rounded border border-border px-0 py-2 text-center text-sm font-medium text-text-muted has-checked:border-accent has-checked:bg-accent-wash has-checked:font-semibold has-checked:text-accent"
              >
                <input type="radio" value={priority} className="sr-only" {...register("priority")} />
                {PRIORITY_LABEL[priority]}
              </label>
            ))}
          </div>
        </div>

        <Field label="Status" error={errors.status}>
          <select className={fieldInputClass} {...register("status")}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Deadline" error={errors.due_date}>
          <input type="date" className={fieldInputClass} {...register("due_date")} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Återkommande" error={errors.recurrence}>
            <select className={fieldInputClass} {...register("recurrence")}>
              {RECURRENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Intervall" error={errors.recurrence_interval}>
            <input
              type="number"
              min={1}
              className={fieldInputClass}
              {...register("recurrence_interval")}
            />
          </Field>

          <Field label="Slutdatum för återkommande" error={errors.recurrence_end_date}>
            <input type="date" className={fieldInputClass} {...register("recurrence_end_date")} />
          </Field>
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Tilldelas
          <UserMultiSelect
            users={users}
            value={assignees}
            onChange={(value) => setValue("assignees", value, { shouldDirty: true })}
          />
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Filer
          <FileUpload folder="flux" files={uploadedFiles.files} onChange={uploadedFiles.setFiles} />
        </div>

        <FormRootError error={errors.root} />
        <FormActions isSubmitting={isSubmitting} submitLabel={task ? "Spara" : "Skapa uppgift"} onCancel={onClose} size="md" className="flex items-center justify-end gap-2.5 pt-2" />
      </form>
    </Drawer>
  );
}
