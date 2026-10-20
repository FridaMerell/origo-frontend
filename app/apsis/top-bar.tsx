"use client";

import { AppLink as Link } from "@/app/components/ui/AppLink";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Menu, MoonIcon, SunIcon } from "lucide-react";
import { NotificationBell } from "@/app/components/ui/NotificationBell";
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
  const router = useRouter();
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
        <span className="flex items-center gap-1">
          {user && (
            <NotificationBell className="flex size-9 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent" />
          )}
          <button
            type="button"
            onClick={onToggleMode}
            aria-label={mode === "dark" ? "Använd ljust läge" : "Använd mörkt läge"}
            className="flex size-9 items-center justify-center rounded text-text-muted hover:bg-accent-wash hover:text-accent"
          >
            {mode === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
          </button>
        </span>
      </div>

      {user ? (
        <Button
          variant="secondary"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          Logga ut
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={() => router.push("/login")}
        >
          Logga in
        </Button>
      )}
    </div>
  );
}

export default function TopBar({ mode, onToggleMode }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const name = user ? formatUserName(user) : null;

  return (
    // The sign's top row: it sits on the page's own surface, in the same column
    // and with the same margins as the content beneath it, not as a separate bar.
    // From xl up the emblem stands in the middle, as the publisher's mark does
    // on a sign, with the menu to its left and the account to its right. From
    // lg it is one row with the emblem first; below that the menu takes a row
    // of its own.
    <header className="container">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 pt-5 pb-4 max-md:mx-6 lg:grid-cols-[auto_1fr_auto] xl:grid-cols-[1fr_auto_1fr]">
      <Link href="/" className="col-start-1 row-start-1 flex items-center gap-2.5 no-underline xl:col-start-2">
        <Logo height={48} className="text-text" />
        <span className="font-display text-2xl font-semibold tracking-tight text-text">Apsis</span>
      </Link>

      <nav aria-label="Huvudmeny" className="col-span-2 row-start-2 hidden items-center gap-6 sm:flex lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:ml-4 xl:col-start-1 xl:ml-0">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`apsis-nav whitespace-nowrap border-b-2 pb-0.5 text-sm font-semibold uppercase tracking-wide no-underline ${
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

      <div className="hidden shrink-0 items-center gap-3 col-start-2 row-start-1 justify-self-end text-sm text-text-muted sm:flex lg:col-start-3">
        <button
          type="button"
          onClick={onToggleMode}
          aria-label={mode === "dark" ? "Använd ljust läge" : "Använd mörkt läge"}
          className="flex size-9 items-center justify-center text-text-muted hover:text-text"
        >
          {mode === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>
        {user && (
          <NotificationBell className="flex size-9 items-center justify-center text-text-muted hover:text-text" />
        )}
        <span className="italic">{name ? `Inloggad som ${name}` : "Ej inloggad"}</span>
        {/* Written as text, like everything else on the sign, not as a filled button. */}
        <button
          type="button"
          className="cursor-pointer whitespace-nowrap font-semibold text-text underline underline-offset-4 hover:text-accent"
          onClick={async () => {
            if (user) {
              await logout();
              router.replace("/login");
            } else {
              router.push("/login");
            }
          }}
        >
          {user ? "Logga ut" : "Logga in"}
        </button>
      </div>

      <Drawer
        trigger={<><span className="sr-only">Öppna meny</span><Menu size={21} aria-hidden="true" /></>}
        triggerVariant="ghost"
        triggerSize="sm"
        triggerClassName="col-start-2 row-start-1 size-10 justify-center justify-self-end p-0 sm:hidden"
        title={<span className="flex items-center gap-2"><Logo height={30} className="text-text" /><span>Apsis</span></span>}
        side="right"
        panelClassName="font-body"
      >
        <MobileMenu mode={mode} onToggleMode={onToggleMode} />
      </Drawer>
      </div>
    </header>
  );
}
