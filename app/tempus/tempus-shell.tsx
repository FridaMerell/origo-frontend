"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Nav from "./nav";

const STORAGE_KEY = "tempus-mode";

export default function TempusShell({ children }: { children: ReactNode }) {
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
        data-theme="tempus"
        data-mode={mode ?? undefined}
        className="flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
      >
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div
      data-theme="tempus"
      data-mode={mode ?? undefined}
      className="flex min-h-screen flex-1 flex-col bg-bg font-body text-text"
    >
      <header className="bg-bg border-b border-border">
      <Nav mode={mode} onToggleMode={toggleMode} />
      </header>
      <main className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</main>
    </div>
  );
}
