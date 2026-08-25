"use client";

import { useTransition } from "react";
import { deleteProject } from "@/app/actions/flux";
import { Icon } from "@/app/components/ui/Icon";

export function DeleteProjectButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="Delete project"
      disabled={pending}
      onClick={() => startTransition(() => deleteProject(id))}
      className="text-text-faint hover:text-danger disabled:opacity-50"
    >
      <Icon name="trash-2" size={14} />
    </button>
  );
}
