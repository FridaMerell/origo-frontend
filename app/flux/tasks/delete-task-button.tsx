"use client";

import { usePathname } from "next/navigation";
import { deleteTask } from "@/app/actions/flux/tasks";
import { DeleteButton } from "@/app/components/ui/DeleteButton";

export function DeleteTaskButton({ id }: { id: number }) {
  const pathname = usePathname();

  return (
    <DeleteButton
      label="Ta bort uppgift"
      confirmTitle="Ta bort uppgift"
      confirmMessage="Ta bort den här uppgiften? Det går inte att ångra."
      stopPropagation
      onDelete={() => { deleteTask(id, pathname) }}
    />
  );
}
