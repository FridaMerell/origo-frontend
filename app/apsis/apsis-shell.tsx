"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import TopBar from "./top-bar";
import { APP_LINKS, appHref } from "@/app/lib/tenant-links";
import { ORIGO_VERSION } from "@/app/lib/config";

const STORAGE_KEY = "apsis-mode";

export default function ApsisShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);
  const [siteHrefs, setSiteHrefs] = useState<Record<string, string>>({});
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setMode(stored === "dark" || stored === "light" ? stored : null);
    setSiteHrefs(
      Object.fromEntries(APP_LINKS.map((app) => [app.id, appHref(app.id)])),
    );
  }, []);

  const toggleMode = () => {
    setMode((previous) => {
      const next = previous
        ? previous === "dark"
          ? "light"
          : "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "light"
          : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  if (isLoginRoute) {
    return (
      <div
        data-theme="apsis"
        data-mode={mode ?? undefined}
        className="flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
      >
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div
      data-theme="apsis"
      data-mode={mode ?? undefined}
      className="flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
    >
      <TopBar mode={mode} onToggleMode={toggleMode} />
      <main className="min-w-0 flex-1">{children}</main>
      <footer className="mt-12 border-t border-border bg-surface text-text-muted">
        <div className="mx-auto flex flex-col items-center justify-between gap-3 px-6 py-5 text-sm sm:flex-row sm:px-12">
          <p className="font-mono">
            Apsis <span className="text-text-faint">·</span> ORIGO {ORIGO_VERSION}
          </p>
          <nav aria-label="Systerplatser" className="flex items-center gap-4">
            {APP_LINKS.filter((site) => site.id !== "apsis").map((site) => (
              <a
                key={site.id}
                href={siteHrefs[site.id] ?? "#"}
                className="no-underline hover:text-accent hover:underline"
              >
                {site.name}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
