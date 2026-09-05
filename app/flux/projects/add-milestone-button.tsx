"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";

import { MilestoneFormDrawer } from "@/app/flux/projects/milestone-form-drawer";
import { Plus } from "lucide-react"

export function AddMilestoneButton({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Nytt delmål
      </Button>
      <MilestoneFormDrawer open={open} onClose={() => setOpen(false)} projectId={projectId} />
    </>
  );
}
