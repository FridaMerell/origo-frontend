"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import TopBar from "./top-bar";
import { APP_LINKS } from "@/app/lib/tenant-links";
import { ORIGO_VERSION } from "@/app/lib/config";
import { ThemeScope } from "@/app/components/ui/ThemeScope";
import { useAppHrefs } from "@/app/components/ui/use-app-hrefs";
import { useStoredMode, type ColorMode } from "@/app/components/ui/use-stored-mode";
import { MODE_KEYS } from "@/app/components/ui/mode-keys";

export default function ApsisShell({ initialMode, children }: { initialMode: ColorMode | null; children: ReactNode }) {
  const [mode, setMode] = useStoredMode(MODE_KEYS.apsis, null, initialMode);
  const siteHrefs = useAppHrefs();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login";

  const toggleMode = () => {
    setMode(
      mode
        ? mode === "dark"
          ? "light"
          : "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "light"
          : "dark",
    );
  };

  if (isLoginRoute) {
    return (
      <ThemeScope
        theme="apsis"
        mode={mode ?? undefined}
        className="flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
      >
        <main className="min-w-0 flex-1">{children}</main>
      </ThemeScope>
    );
  }

  return (
    <ThemeScope
      theme="apsis"
      mode={mode ?? undefined}
      className="grain flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
    >
      <TopBar mode={mode} onToggleMode={toggleMode} />
      <main className="min-w-0 flex-1">{children}</main>
      {/* The sign's bottom row, in the same column as the menu and the content. */}
      <footer className="container mt-12 text-text-muted">
        <div className="flex flex-col items-center justify-between gap-3 border-t-4 border-double border-text py-5 text-sm max-md:mx-6 sm:flex-row">
          <p>
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
            <a
              href={siteHrefs.origo ? `${siteHrefs.origo}integritet` : "#"}
              className="no-underline hover:text-accent hover:underline"
            >
              Integritet
            </a>
          </nav>
        </div>
      </footer>
    </ThemeScope>
  );
}
