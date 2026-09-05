"use client";

import { useTransition, type ReactNode } from "react";
import { Icon } from "@/app/components/ui/Icon";
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog";

export function DeleteButton({
  onDelete,
  label,
  confirmMessage,
  confirmTitle = "Bekräfta borttagning",
  showTitle = false,
  stopPropagation = false,
  className = "text-text-faint hover:text-danger disabled:opacity-50",
}: {
  onDelete: () => void;
  label: string;
  confirmMessage: ReactNode;
  confirmTitle?: string;
  showTitle?: boolean;
  stopPropagation?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const { requestConfirm, dialog } = useConfirmDialog();

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={showTitle ? label : undefined}
        disabled={pending}
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation();
          requestConfirm({
            title: confirmTitle,
            message: confirmMessage,
            confirmLabel: "Ta bort",
            destructive: true,
            onConfirm: () => startTransition(onDelete),
          });
        }}
        className={className}
      >
        <Icon name="trash-2" size={14} />
      </button>
      {dialog}
    </>
  );
}
