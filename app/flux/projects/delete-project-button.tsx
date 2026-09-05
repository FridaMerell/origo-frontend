"use client";

import { deleteProject } from "@/app/actions/flux/projects";
import { DeleteButton } from "@/app/components/ui/DeleteButton";
import { useFluxProjectActions, useFluxProjects } from "@/app/flux/_state/flux-context";

export function DeleteProjectButton({ id }: { id: number }) {
  const projects = useFluxProjects();
  const { addProject, removeProject } = useFluxProjectActions();
  const project = projects.find((item) => item.id === id);

  return (
    <DeleteButton
      label="Ta bort projekt"
      confirmTitle="Ta bort projekt"
      confirmMessage="Ta bort det här projektet? Alla milstolpar, uppgifter och uppdateringar tas bort med det. Det går inte att ångra."
      onDelete={async () => {
        removeProject(id);
        const result = await deleteProject(id);
        if (result?.error && project) addProject(project);
      }}
    />
  );
}
