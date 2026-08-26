"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Icon } from "@/app/components/ui/Icon";
import { TaskFormDrawer } from "@/app/flux/tasks/task-form-drawer";

export function AddTaskButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} className="text-accent-contrast" />
        Ny uppgift
      </Button>
      <TaskFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
