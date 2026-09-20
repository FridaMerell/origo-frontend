"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { VERSO_MODE_COOKIE } from "@/app/lib/config";
import Sidebar from "./sidebar";
import MobileNav from "./mobile-nav";

export type VersoMode = "light" | "dark";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** `initialMode` comes from a cookie read on the server, so the first paint already has the right theme. */
export default function VersoShell({ children, initialMode }: { children: ReactNode; initialMode: VersoMode }) {
  const [mode, setMode] = useState<VersoMode>(initialMode);
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login";

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    document.cookie = `${VERSO_MODE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    setMode(next);
  };

  if (isLoginRoute) {
    return (
      <div data-theme="verso" data-mode={mode} className="flex h-full min-h-screen flex-1 flex-col bg-bg text-text font-body">
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div
      data-theme="verso"
      data-mode={mode}
      className="flex h-full min-h-screen flex-1 flex-col bg-bg text-text font-body md:flex-row"
    >
      <Sidebar mode={mode} onToggleMode={toggleMode} />
      <MobileNav mode={mode} onToggleMode={toggleMode} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
