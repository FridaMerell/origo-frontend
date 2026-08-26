"use client";

import { useTransition } from "react";
import { deleteUpdate } from "@/app/actions/flux";
import { Icon } from "@/app/components/ui/Icon";

export function DeleteUpdateButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="Ta bort uppdatering"
      disabled={pending}
      onClick={() => {
        startTransition(() => { deleteUpdate(id) });
      }}
      className="text-text-faint hover:text-danger disabled:opacity-50"
    >
      <Icon name="trash-2" size={14} />
    </button>
  );
}
