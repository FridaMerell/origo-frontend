"use client";

import { usePathname } from "next/navigation";
import { deleteProject } from "@/app/actions/flux";
import { DeleteButton } from "@/app/components/ui/DeleteButton";

export function DeleteProjectButton({ id }: { id: number }) {
  const pathname = usePathname();

  return (
    <DeleteButton
      label="Ta bort projekt"
      onDelete={() => { deleteProject(id, pathname) }}
    />
  );
}
