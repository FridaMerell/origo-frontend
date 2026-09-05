"use client";

import { usePathname } from "next/navigation";
import { deleteProject } from "@/app/actions/flux/projects";
import { DeleteButton } from "@/app/components/ui/DeleteButton";

export function DeleteProjectButton({ id }: { id: number }) {
  const pathname = usePathname();

  return (
    <DeleteButton
      label="Ta bort projekt"
      confirmTitle="Ta bort projekt"
      confirmMessage="Ta bort det här projektet? Alla milstolpar, uppgifter och uppdateringar tas bort med det. Det går inte att ångra."
      onDelete={() => { deleteProject(id, pathname) }}
    />
  );
}
