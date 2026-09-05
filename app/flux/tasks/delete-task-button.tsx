"use client";

import { usePathname } from "next/navigation";
import { deleteTask } from "@/app/actions/flux";
import { DeleteButton } from "@/app/components/ui/DeleteButton";

export function DeleteTaskButton({ id }: { id: number }) {
  const pathname = usePathname();

  return (
    <DeleteButton
      label="Ta bort uppgift"
      stopPropagation
      onDelete={() => { deleteTask(id, pathname) }}
    />
  );
}
