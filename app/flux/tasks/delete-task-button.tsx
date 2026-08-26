"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { deleteTask } from "@/app/actions/flux";
import { Icon } from "@/app/components/ui/Icon";

export function DeleteTaskButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  return (
    <button
      type="button"
      aria-label="Delete task"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        startTransition(() => { deleteTask(id, pathname) });
      }}
      className="text-text-faint hover:text-danger disabled:opacity-50"
    >
      <Icon name="trash-2" size={14} />
    </button>
  );
}
