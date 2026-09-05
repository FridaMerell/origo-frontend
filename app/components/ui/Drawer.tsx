"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { X } from "lucide-react"

const DrawerCloseContext = createContext<(() => void) | null>(null);

export function useDrawerClose() {
  const close = useContext(DrawerCloseContext);
  return close ?? (() => {});
}

type DrawerProps = {
  trigger?: ReactNode;
  triggerVariant?: "primary" | "secondary" | "ghost" | "paper" | "paper-bordered";
  triggerSize?: "sm" | "md";
  triggerClassName?: string;
  title?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  side?: "left" | "right";
  panelClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Drawer({
  trigger,
  triggerVariant = "primary",
  triggerSize = "md",
  triggerClassName,
  title,
  headerActions,
  children,
  side = "right",
  panelClassName = "",
  open: openProp,
  onOpenChange,
}: DrawerProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!open || entered) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open, entered]);

  // The panel is portaled to <body>, outside the [data-theme]/[data-mode] scope
  // the tenant shells set on a nested div — so bg-surface & friends would resolve
  // to nothing. Mirror the nearest ambient theme onto the portal root.
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [theme, setTheme] = useState<{ theme?: string; mode?: string }>({});
  useEffect(() => {
    if (!open) return;
    const scope = anchorRef.current?.closest<HTMLElement>("[data-theme]");
    if (scope) setTheme({ theme: scope.dataset.theme, mode: scope.dataset.mode });
  }, [open]);

  function setOpen(value: boolean) {
    if (!value) setEntered(false);
    setOpenState(value);
    onOpenChange?.(value);
  }

  return (
    <>
      <span ref={anchorRef} aria-hidden className="hidden" />
      {trigger !== undefined && (
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          onClick={() => setOpen(true)}
        >
          {trigger}
        </Button>
      )}

      {open && (typeof document !== "undefined" ? createPortal(
        <div
          data-theme={theme.theme}
          data-mode={theme.mode}
          className="fixed inset-0 z-[100] flex bg-black/60 transition-opacity"
          style={{
            transitionDuration: "var(--duration-normal)",
            transitionTimingFunction: "var(--ease-standard)",
            opacity: entered ? 1 : 0,
          }}
          // Close on a press that starts on the backdrop. Handling this on click
          // can close the drawer when a drag that began inside the panel ends
          // outside it (for example while adjusting a slider or selecting text).
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`flex h-full w-full max-w-sm flex-col bg-surface shadow-lg transition-transform ${panelClassName} ${side === "right" ? "ml-auto" : "mr-auto"}`}
            style={{
              transitionDuration: "var(--duration-normal)",
              transitionTimingFunction: "var(--ease-standard)",
              transform: entered ? "translateX(0)" : `translateX(${side === "right" ? "100%" : "-100%"})`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="m-0 min-w-0 truncate font-display text-lg font-semibold text-text">{title}</h2>
              <div className="flex shrink-0 items-center gap-3">
                {headerActions}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Stäng"
                  className="text-text-muted hover:text-text"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DrawerCloseContext.Provider value={() => setOpen(false)}>
                {children}
              </DrawerCloseContext.Provider>
            </div>
          </div>
        </div>,
        document.body,
      ) : null)}
    </>
  );
}
