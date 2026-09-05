"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";

import { ProjectFormDrawer } from "@/app/flux/projects/project-form-drawer";
import { Plus } from "lucide-react"

export function AddProjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} className="text-accent-contrast" />
        Nytt projekt
      </Button>
      <ProjectFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
