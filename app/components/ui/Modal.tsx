"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useDismissableOpen } from "./use-dismissable-open";

const ModalCloseContext = createContext<(() => void) | null>(null);

/** Closes the closest parent modal. Safe to call outside a modal. */
export function useModalClose() {
  return useContext(ModalCloseContext) ?? (() => {});
}

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  confirmExit?: boolean | ConfirmExitOptions;
};

export type ConfirmExitOptions = {
  title?: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
};

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
};

/**
 * A centred, portal-rendered modal for focused tasks such as forms and detail views.
 * Control it with `open` and `onOpenChange` from the component that owns its state.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className = "",
  confirmExit = false,
}: ModalProps) {
  const [entered, setEntered] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [theme, setTheme] = useState<{ theme?: string; mode?: string }>({});
  const [fontVariableClasses, setFontVariableClasses] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const confirmExitOptions = typeof confirmExit === "object" ? confirmExit : {};

  function requestClose() {
    if (confirmExit) {
      setConfirmExitOpen(true);
      return;
    }
    onOpenChange(false);
  }

  const dismissable = useDismissableOpen<HTMLDivElement>({
    open,
    onDismiss: requestClose,
  });

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const scope = anchorRef.current?.closest<HTMLElement>("[data-theme]");
    if (scope) {
      setTheme({ theme: scope.dataset.theme, mode: scope.dataset.mode });
      // A portal sits outside the tenant layout, where next/font attaches its
      // CSS variable classes. Carry just those classes over so modal content
      // uses the active tenant's loaded typefaces rather than fallback fonts.
      let fontScope: HTMLElement | null = scope;
      while (fontScope && !Array.from(fontScope.classList).some((className) => className.includes("__variable"))) {
        fontScope = fontScope.parentElement;
      }
      setFontVariableClasses(
        Array.from(fontScope?.classList ?? [])
          .filter((className) => className.includes("__variable"))
          .join(" "),
      );
    }

    const frame = requestAnimationFrame(() => {
      setEntered(true);
      dialogRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || activeElement === dialogRef.current)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <span ref={anchorRef} aria-hidden className="hidden" />
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              data-theme={theme.theme}
              data-mode={theme.mode}
              className={`${fontVariableClasses} fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 transition-opacity`}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) requestClose();
              }}
              style={{
                transitionDuration: "var(--duration-normal)",
                transitionTimingFunction: "var(--ease-standard)",
                opacity: entered ? 1 : 0,
              }}
            >
              <div
                ref={(node) => {
                  dialogRef.current = node;
                  dismissable.ref.current = node;
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                className={`flex max-h-[calc(100vh-2rem)] w-full flex-col !rounded-[14px] border border-border bg-surface font-body text-text shadow-lg outline-none transition-transform ${SIZES[size]} ${className}`}
                style={{
                  transitionDuration: "var(--duration-normal)",
                  transitionTimingFunction: "var(--ease-standard)",
                  transform: entered ? "scale(1)" : "scale(0.96)",
                }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                  <div className="min-w-0">
                    <h2 id={titleId} className="m-0 font-display text-lg font-semibold text-text">
                      {title}
                    </h2>
                    {description && (
                      <p id={descriptionId} className="mb-0 mt-1 text-sm text-text-muted">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={requestClose}
                    aria-label="Stäng"
                    className="shrink-0 text-text-muted transition-colors hover:text-text"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <ModalCloseContext.Provider value={requestClose}>
                    {children}
                  </ModalCloseContext.Provider>
                </div>
                {footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
              </div>
            </div>,
            document.body,
          )
        : null}
      <ConfirmDialog
        open={confirmExitOpen}
        title={confirmExitOptions.title ?? "Avsluta utan att spara?"}
        message={confirmExitOptions.message ?? "Dina ändringar går förlorade om du stänger nu."}
        confirmLabel={confirmExitOptions.confirmLabel ?? "Avsluta"}
        cancelLabel={confirmExitOptions.cancelLabel ?? "Fortsätt redigera"}
        onConfirm={() => {
          setConfirmExitOpen(false);
          onOpenChange(false);
        }}
        onCancel={() => setConfirmExitOpen(false)}
      />
    </>
  );
}
