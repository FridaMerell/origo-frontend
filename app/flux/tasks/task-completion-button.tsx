"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { toggleTaskStatus } from "@/app/actions/flux";
import { Icon } from "@/app/components/ui/Icon";
import type { FluxTaskStatus } from "@/app/lib/dal";

export function TaskCompletionButton({
  id,
  status,
  className = "",
  stopPropagation = true,
}: {
  id: number;
  status: FluxTaskStatus;
  className?: string;
  stopPropagation?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const done = status === "done";
  const label = done ? "Återställ uppgift" : "Markera uppgift som klar";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        startTransition(() => {
          toggleTaskStatus(id, !done, pathname);
        });
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border px-2 py-1 text-text-faint transition hover:text-text disabled:opacity-50 ${
        done ? "border-success bg-success-wash text-success" : "border-border bg-surface"
      } ${className}`}
    >
      <Icon name={done ? "check-circle-2" : "circle"} size={14} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
