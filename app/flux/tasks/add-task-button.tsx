"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";

import { TaskFormDrawer } from "@/app/flux/tasks/task-form-drawer";
import { Plus } from "lucide-react"

export function AddTaskButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} className="text-accent-contrast" />
        Ny uppgift
      </Button>
      <TaskFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
