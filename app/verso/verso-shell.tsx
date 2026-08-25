"use client";

import { useEffect, useState, type ReactNode } from "react";
import Sidebar from "./sidebar";

const STORAGE_KEY = "verso-mode";

export default function VersoShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setMode(stored === "dark" || stored === "light" ? stored : "light");
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <div
      data-theme="verso"
      data-mode={mode ?? undefined}
      className="flex h-full min-h-screen flex-1 bg-bg text-text font-body"
    >
      <Sidebar mode={mode} onToggleMode={toggleMode} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
