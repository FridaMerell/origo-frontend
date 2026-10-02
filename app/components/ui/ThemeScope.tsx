"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const PortalContainerContext = createContext<HTMLElement | null>(null);

/**
 * A tenant's theme scope: sets `data-theme`/`data-mode` and keeps a portal container inside
 * the scope. Drawers, modals and dialogs portal into it (see `usePortalContainer`), so they
 * inherit the tenant's colours, mode and typefaces — including the next/font CSS variables a
 * tenant layout attaches as classes on an ancestor, which a portal to <body> would miss.
 */
export function ThemeScope({
  theme,
  mode,
  className,
  children,
}: {
  theme: string;
  mode?: string;
  className?: string;
  children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <div data-theme={theme} data-mode={mode} className={className}>
      <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>
      {/* `display: contents` keeps the container out of the scope's flex layout. */}
      <div ref={setContainer} data-portal-root style={{ display: "contents" }} />
    </div>
  );
}

/** Where portals render: the nearest ThemeScope, or <body> outside one. */
export function usePortalContainer(): HTMLElement | null {
  const container = useContext(PortalContainerContext);
  if (container) return container;
  return typeof document !== "undefined" ? document.body : null;
}
