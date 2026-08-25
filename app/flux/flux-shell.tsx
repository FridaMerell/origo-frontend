"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/app/components/ui/Icon";
import Toolbar from "./toolbar";
import { ProductSwitcher } from "./product-switcher";

const STORAGE_KEY = "flux-mode";

export default function FluxShell({
  children,
  userName,
}: {
  children: ReactNode;
  userName: string;
}) {
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
      data-theme="flux"
      data-mode={mode ?? undefined}
      className="flex h-full min-h-screen flex-1 flex-col bg-bg text-text font-body"
    >
      <a
        href="/"
        className="fixed left-6 top-5 z-40 flex items-center gap-1.5 font-display text-lg font-semibold text-accent no-underline"
      >
        <Icon name="zap" size={18} className="text-accent" />
        Flux
      </a>
      <ProductSwitcher />
      <div className="flex-1 overflow-auto pb-24 pt-14">{children}</div>
      <Toolbar mode={mode} onToggleMode={toggleMode} userName={userName} />
    </div>
  );
}
