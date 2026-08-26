"use client";

import { useState } from "react";
import { Icon } from "@/app/components/ui/Icon";
import { MilestoneFormDrawer } from "@/app/flux/projects/milestone-form-drawer";
import type { FluxMilestone } from "@/app/lib/dal";

export function EditMilestoneButton({ milestone }: { milestone: FluxMilestone }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Edit milestone"
        onClick={() => setOpen(true)}
        className="text-text-faint hover:text-text"
      >
        <Icon name="pencil" size={14} />
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
