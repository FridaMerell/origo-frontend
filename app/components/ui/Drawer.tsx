"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

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
  open: openProp,
  onOpenChange,
}: DrawerProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  function setOpen(value: boolean) {
    setOpenState(value);
    onOpenChange?.(value);
  }

  return (
    <>
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

      {open && (
        <div
          className="fixed inset-0 z-50 flex bg-black/60 transition-opacity"
          style={{
            transitionDuration: "var(--duration-normal)",
            transitionTimingFunction: "var(--ease-standard)",
            opacity: entered ? 1 : 0,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`flex h-full w-full max-w-sm flex-col bg-surface shadow-lg transition-transform ${side === "right" ? "ml-auto" : "mr-auto"}`}
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
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DrawerCloseContext.Provider value={() => setOpen(false)}>
                {children}
              </DrawerCloseContext.Provider>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
