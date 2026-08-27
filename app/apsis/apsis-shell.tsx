"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import TopBar from "./top-bar";

const STORAGE_KEY = "apsis-mode";

export default function ApsisShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setMode(stored === "dark" || stored === "light" ? stored : null);
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
    </div>
  );
}
