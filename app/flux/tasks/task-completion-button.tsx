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
  compact = false,
}: {
  id: number;
  status: FluxTaskStatus;
  className?: string;
  stopPropagation?: boolean;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const done = status === "done";
  const label = done ? "Återställ uppgift" : "Markera uppgift som klar";
  const stateLabel = done ? "Klar" : "Öppen";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      title={label}
      disabled={pending}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        startTransition(() => {
          toggleTaskStatus(id, !done, pathname);
        });
      }}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-text-faint transition hover:text-text disabled:opacity-50 ${
        done
          ? "border-success/60 bg-success-wash text-success"
          : "border-border bg-surface text-text-muted hover:border-text"
      } ${compact ? "min-w-0 px-1.5" : "min-w-[5.25rem]"} ${className}`}
    >
      <Icon name={done ? "check-circle-2" : "circle"} size={14} />
      {!compact && <span className="text-[11px] font-semibold uppercase tracking-wide">{stateLabel}</span>}
    </button>
  );
}
