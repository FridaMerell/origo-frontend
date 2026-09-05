"use client";

import { useTransition } from "react";
import { Icon } from "@/app/components/ui/Icon";

export function DeleteButton({
  onDelete,
  label,
  showTitle = false,
  stopPropagation = false,
  className = "text-text-faint hover:text-danger disabled:opacity-50",
}: {
  onDelete: () => void;
  label: string;
  showTitle?: boolean;
  stopPropagation?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={label}
      title={showTitle ? label : undefined}
      disabled={pending}
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        startTransition(onDelete);
      }}
      className={className}
    >
      <Icon name="trash-2" size={14} />
    </button>
  );
}
