"use client";

import { deleteTask } from "@/app/actions/flux/tasks";
import { DeleteButton } from "@/app/components/ui/DeleteButton";
import { useFluxTaskActions, useFluxTasks } from "@/app/flux/_state/flux-context";

export function DeleteTaskButton({ id }: { id: number }) {
  const tasks = useFluxTasks();
  const { addTask, removeTask } = useFluxTaskActions();
  const task = tasks.find((item) => item.id === id);

  return (
    <DeleteButton
      label="Ta bort uppgift"
      confirmTitle="Ta bort uppgift"
      confirmMessage="Ta bort den här uppgiften? Det går inte att ångra."
      stopPropagation
      onDelete={async () => {
        removeTask(id);
        const result = await deleteTask(id);
        if (result?.error && task) addTask(task);
      }}
    />
  );
}
