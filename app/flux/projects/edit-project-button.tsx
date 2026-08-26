"use client";

import { useState } from "react";
import { Icon } from "@/app/components/ui/Icon";
import { ProjectFormDrawer } from "@/app/flux/projects/project-form-drawer";
import type { FluxProject } from "@/app/lib/dal";

export function EditProjectButton({ project }: { project: FluxProject }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Edit project"
        onClick={() => setOpen(true)}
        className="text-text-faint hover:text-text"
      >
        <Icon name="pencil" size={16} />
      </button>
      <ProjectFormDrawer open={open} onClose={() => setOpen(false)} project={project} />
    </>
  );
}
