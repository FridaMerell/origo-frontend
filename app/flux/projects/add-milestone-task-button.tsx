"use client";

import { useState } from "react";

import { TaskFormDrawer } from "@/app/flux/tasks/task-form-drawer";
import { Button } from "@/app/components/ui/Button"
import { Plus } from "lucide-react"

export function AddMilestoneTaskButton({
  projectId,
  milestoneId,
}: {
  projectId: number;
  milestoneId: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 text-left text-sm text-text-muted hover:text-text"
      >
        <Plus size={13} />
        Skapa uppgift
      </Button>
      <TaskFormDrawer
        open={open}
        onClose={() => setOpen(false)}
        defaultProjectId={projectId}
        defaultMilestoneId={milestoneId}
      />
    </>
  );
}
