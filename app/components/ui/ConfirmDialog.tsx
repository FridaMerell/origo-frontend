"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Modal yes/no confirmation, used before destructive actions instead of the native `window.confirm`. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Bekräfta",
  cancelLabel = "Avbryt",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [entered, setEntered] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setEntered(false);
  }
  useEffect(() => {
    if (!open || entered) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open, entered]);

  // The dialog is portaled to <body>, outside the [data-theme]/[data-mode] scope
  // the tenant shells set on a nested div — mirror the nearest ambient theme onto
  // the portal root (see Drawer.tsx, which has the same problem).
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [theme, setTheme] = useState<{ theme?: string; mode?: string }>({});
  useEffect(() => {
    if (!open) return;
    const scope = anchorRef.current?.closest<HTMLElement>("[data-theme]");
    if (scope) setTheme({ theme: scope.dataset.theme, mode: scope.dataset.mode });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  return (
    <>
      <span ref={anchorRef} aria-hidden className="hidden" />
      {open && typeof document !== "undefined" ? createPortal(
        <div
          data-theme={theme.theme}
          data-mode={theme.mode}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 transition-opacity"
          style={{
            transitionDuration: "var(--duration-normal)",
            transitionTimingFunction: "var(--ease-standard)",
            opacity: entered ? 1 : 0,
          }}
          onClick={onCancel}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-lg transition-transform"
            style={{
              transitionDuration: "var(--duration-normal)",
              transitionTimingFunction: "var(--ease-standard)",
              transform: entered ? "scale(1)" : "scale(0.96)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="m-0 font-display text-lg font-semibold text-text">
              {title}
            </h2>
            <p id="confirm-dialog-message" className="mt-2 text-sm text-text-muted">
              {message}
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
                {cancelLabel}
              </Button>
              {destructive ? (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded bg-danger px-3 py-1.5 text-sm font-semibold text-accent-contrast transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "Tar bort…" : confirmLabel}
                </button>
              ) : (
                <Button type="button" variant="primary" size="sm" onClick={onConfirm} disabled={pending}>
                  {pending ? "…" : confirmLabel}
                </Button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
