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
  const nextLabel = status === "not_started" ? "Markera som påbörjad" : status === "in_progress" ? "Markera som klar" : "Öppna uppgift";
  const stateLabel = status === "not_started" ? "Öppen" : status === "in_progress" ? "Påbörjad" : "Klar";
  const stateClass = status === "done"
    ? "border-success/60 bg-success-wash text-success"
    : status === "in_progress"
      ? "border-warning/60 bg-warning-wash text-warning"
      : "border-border bg-surface text-text-muted hover:border-text";
  const icon = status === "done" ? "check-circle-2" : status === "in_progress" ? "play-circle" : "circle";

  return (
    <button
      type="button"
      aria-label={nextLabel}
      aria-pressed={status === "done"}
      title={nextLabel}
      disabled={pending}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        startTransition(() => {
          toggleTaskStatus(id, status, pathname);
        });
      }}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-2 py-1 text-text-faint transition hover:text-text disabled:opacity-50 ${stateClass} ${compact ? "min-w-0 px-1.5" : "min-w-[5.25rem]"} ${className}`}
    >
      <Icon name={icon} size={14} />
      {!compact && <span className="text-[11px] font-semibold uppercase tracking-wide">{stateLabel}</span>}
    </button>
  );
}
