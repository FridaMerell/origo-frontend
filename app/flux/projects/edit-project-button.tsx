"use client";

import { useState } from "react";

import { ProjectFormDrawer } from "@/app/flux/projects/project-form-drawer";
import type { FluxProject } from "@/app/lib/dal";
import { Pencil } from "lucide-react"

export function EditProjectButton({ project }: { project: FluxProject }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Redigera projekt"
        onClick={() => setOpen(true)}
        className="text-text-faint hover:text-text"
      >
        <Pencil size={16} />
      </button>
      <ProjectFormDrawer open={open} onClose={() => setOpen(false)} project={project} />
    </>
  );
}
