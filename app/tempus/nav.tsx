"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Icon } from "@/app/components/ui/Icon";
import { useUser } from "@/app/lib/user-context";
import Logo from "./ui/Logo";

type NavProps = {
  mode: "light" | "dark" | null;
  onToggleMode: () => void;
};

export default function Nav({ mode, onToggleMode }: NavProps) {
  const pathname = usePathname();
  const user = useUser();

  return (
    <nav className="sticky top-0 z-40 flex h-[72px] items-center border-b border-border bg-surface px-4 sm:px-8">
      <Link href="/" className="flex items-center gap-2 no-underline">
        <Logo height={48} className="text-text" />
        <span className="font-display text-[28px] font-semibold tracking-tight text-text">Tempus</span>
      </Link>

      <div className="ml-10 hidden h-full items-center sm:flex">
        <Link
          href="/"
          className={`flex h-full items-center border-b-2 px-3 text-sm no-underline ${
            pathname === "/"
              ? "border-accent font-semibold text-text"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Översikt
        </Link>
        <Link 
          href="/rutt"
          className={`flex h-full items-center border-b-2 px-3 text-sm no-underline ${
            pathname === "/rutt"
              ? "border-accent font-semibold text-text"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Rutt
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleMode}
          aria-label={mode === "dark" ? "Använd ljust läge" : "Använd mörkt läge"}
          className="flex size-10 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent"
        >
          <Icon name={mode === "dark" ? "sun" : "moon"} size={18} />
        </button>
        {user ? (
          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            aria-label="Logga ut"
            className="flex size-10 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent"
          >
            <Icon name="log-out" size={18} />
          </button>
        ) : (
          <Link
            href="/login"
            aria-label="Logga in"
            className="flex size-10 items-center justify-center rounded text-text-muted no-underline hover:bg-accent-wash hover:text-accent"
          >
            <Icon name="log-in" size={18} />
          </Link>
        )}
      </div>
    </nav>
  );
}
