"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Icon } from "@/app/components/ui/Icon";
import { ProjectFormModal } from "@/app/flux/projects/project-form-modal";

export function AddProjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} className="text-accent-contrast" />
        New project
      </Button>
      <ProjectFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
