"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import MobileNav from "./mobile-nav";

const STORAGE_KEY = "verso-mode";

export default function VersoShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login";

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
