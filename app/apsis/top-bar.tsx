"use client";

import { AppLink as Link } from "@/app/components/ui/AppLink";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Menu, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Drawer, useDrawerClose } from "@/app/components/ui/Drawer";
import { useUser, formatUserName } from "@/app/lib/user-context";
import Logo from "./ui/Logo";

type TopBarProps = {
  mode: "light" | "dark" | null;
  onToggleMode: () => void;
};

const TABS = [
  { href: "/", label: "Absider" },
  { href: "/wall-of-shame", label: "Wall of shame" },
  { href: "/slumpa", label: "Slumpa" },
  { href: "/ladda-upp", label: "Ladda upp" },
];

function MobileMenu({ mode, onToggleMode }: TopBarProps) {
  const close = useDrawerClose();
  const pathname = usePathname();
  const user = useUser();
  const name = user ? formatUserName(user) : null;

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-col border-y border-border" aria-label="Huvudmeny">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={close}
            className={`border-b border-border py-3 text-sm font-semibold uppercase tracking-wide no-underline last:border-b-0 ${
              pathname === tab.href ? "text-text" : "text-text-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text-muted">{name ? `Inloggad som ${name}` : "Ej inloggad"}</span>
        <button
          type="button"
          onClick={onToggleMode}
          aria-label={mode === "dark" ? "Använd ljust läge" : "Använd mörkt läge"}
          className="flex size-9 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent"
        >
          {mode === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>
      </div>

      {user ? (
        <Button
          variant="secondary"
          onClick={async () => {
            await logout();
            window.location.href = "/login";
          }}
        >
          Logga ut
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          Logga in
        </Button>
      )}
    </div>
  );
}

export default function TopBar({ mode, onToggleMode }: TopBarProps) {
  const pathname = usePathname();
  const user = useUser();
  const name = user ? formatUserName(user) : null;

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border bg-surface px-6 py-4 sm:gap-7 sm:px-12">
      <Link href="/" className="flex items-center gap-2 no-underline">
        <Logo height={48} className="text-text" />
        <span className="font-display text-2xl font-semibold tracking-tight text-text">Apsis</span>
      </Link>

      <nav className="order-3 hidden w-full items-center gap-5 sm:order-0 sm:flex sm:w-auto sm:gap-7">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`border-b-2 pb-0.5 text-sm font-semibold uppercase tracking-wide no-underline ${
                active
                  ? "border-accent text-text"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex sm:gap-3">
        <button
          type="button"
          onClick={onToggleMode}
          aria-label={mode === "dark" ? "Använd ljust läge" : "Använd mörkt läge"}
          className="flex size-9 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent"
        >
          {mode === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>
        <span className="hidden text-[13px] text-text-muted sm:inline">
          {name ? `Inloggad som ${name}` : "Ej inloggad"}
        </span>
        {user ? (
          <Button
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
          >
            Logga ut
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Logga in
          </Button>
        )}
      </div>

      <Drawer
        trigger={<><span className="sr-only">Öppna meny</span><Menu size={21} aria-hidden="true" /></>}
        triggerVariant="ghost"
        triggerSize="sm"
        triggerClassName="ml-auto size-10 justify-center p-0 sm:hidden"
        title={<span className="flex items-center gap-2"><Logo height={30} className="text-text" /><span>Apsis</span></span>}
        side="right"
        panelClassName="font-body"
      >
        <MobileMenu mode={mode} onToggleMode={onToggleMode} />
      </Drawer>
    </header>
  );
}
