"use client";

import { useState } from "react";

import { MilestoneFormDrawer } from "@/app/flux/projects/milestone-form-drawer";
import type { FluxMilestone } from "@/app/lib/dal";
import { Pencil } from "lucide-react"

export function EditMilestoneButton({ milestone }: { milestone: FluxMilestone }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Redigera delmål"
        onClick={() => setOpen(true)}
        className="text-text-faint hover:text-text"
      >
        <Pencil  size={14} />
      </button>
      <MilestoneFormDrawer
        open={open}
        onClose={() => setOpen(false)}
        projectId={milestone.project}
        milestone={milestone}
      />
    </>
  );
}
