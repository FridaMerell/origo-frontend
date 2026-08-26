"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createTask, updateTask, type FluxActionState } from "@/app/actions/flux";
import { Button } from "@/app/components/ui/Button";
import { Drawer } from "@/app/components/ui/Drawer";
import { UserMultiSelect } from "@/app/flux/user-multiselect";
import { useFluxMilestones, useFluxProjects, useSelectedFluxProject } from "@/app/lib/flux-context";
import { useUsers } from "@/app/lib/user-context";
import type { FluxTask, FluxTaskStatus } from "@/app/lib/dal";

const STATUS_OPTIONS: { value: FluxTaskStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const initialState: FluxActionState = undefined;

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
  const action = useMemo(
    () => (task ? updateTask.bind(null, task.id) : createTask),
    [task?.id]
  );

  const [state, formAction, pending] = useActionState(action, initialState);

  const projects = useFluxProjects();
  const { selectedProject } = useSelectedFluxProject();
  const milestones = useFluxMilestones();
  const users = useUsers();
  const pathname = usePathname();

  const [projectId, setProjectId] = useState<number | undefined>(
    task?.project ?? defaultProjectId ?? selectedProject?.id ?? projects[0]?.id
  );

  const previousSuccess = useRef(false);

  useEffect(() => {
    const isSuccess = !!state?.success;

    if (isSuccess && !previousSuccess.current) {
      onClose();
    }

    previousSuccess.current = isSuccess;
  }, [state?.success, onClose]);

  useEffect(() => {
    if (open) {
      setProjectId(
        task?.project ??
          defaultProjectId ??
          selectedProject?.id ??
          projects[0]?.id
      );
    }
  }, [
    open,
    task?.project,
    defaultProjectId,
    selectedProject?.id,
    projects,
  ]);

  const availableMilestones = milestones.filter(
    (milestone) => milestone.project === projectId
  );

  return (
    <Drawer
      title={task ? "Redigera uppgift" : "Ny uppgift"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <form action={formAction} className="flex flex-col gap-4.5">
        <input type="hidden" name="path" value={pathname} />

        {defaultParentId != null && (
          <input type="hidden" name="parent" value={defaultParentId} />
        )}

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Namn
          <input
            type="text"
            name="title"
            required
            defaultValue={task?.title}
            placeholder="t.ex. Kalibrera IMU på rev-C kort"
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Beskrivning
          <textarea
            name="description"
            rows={3}
            defaultValue={task?.description}
            placeholder="Vad behöver göras, och varför"
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Projekt
          <select
            name="project"
            required
            value={projectId}
            onChange={(e) => setProjectId(Number(e.target.value))}
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Delmål
          <select
            name="milestone"
            defaultValue={task?.milestone ?? defaultMilestoneId ?? ""}
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          >
            <option value="">Inget delmål</option>

            {availableMilestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-muted">Prioritet</span>

          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((priority) => (
              <label
                key={priority}
                className="flex-1 cursor-pointer rounded border border-border px-0 py-2 text-center text-sm font-medium capitalize text-text-muted has-checked:border-accent has-checked:bg-accent-wash has-checked:font-semibold has-checked:text-accent"
              >
                <input
                  type="radio"
                  name="priority"
                  value={priority}
                  defaultChecked={
                    (task?.priority ?? "medium") === priority
                  }
                  className="sr-only"
                />

                {priority}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Status
          <select
            name="status"
            defaultValue={task?.status ?? "not_started"}
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-text-muted">
          Deadline
          <input
            type="date"
            name="due_date"
            defaultValue={task?.due_date ?? ""}
            className="rounded border border-field-border bg-surface px-2.5 py-1.5 text-text"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          Tilldelas

          <UserMultiSelect
            name="assignees"
            users={users}
            defaultSelected={task?.assignees ?? []}
          />
        </div>

        {state?.errors?.project && (
          <p className="text-sm text-danger">
            {state.errors.project[0]}
          </p>
        )}

        {state?.errors?.title && (
          <p className="text-sm text-danger">
            {state.errors.title[0]}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
          >
            Avbryt
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={pending}
          >
            {pending ? "Sparar..." : task ? "Spara" : "Skapa uppgift"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}