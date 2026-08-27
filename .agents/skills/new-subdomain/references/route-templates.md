# Route-group templates

Starting points for `app/<id>/`. Replace `atlas` / `Atlas` with the real id and
display name. These mirror the verso/flux implementations — read those next to
these when adapting.

## layout.tsx

```tsx
import type { ReactNode } from "react";
import AtlasShell from "./atlas-shell";

export const metadata = {
  title: "Atlas | Origo",
  description: "Atlas - Origo",
};

export default function AtlasLayout({ children }: { children: ReactNode }) {
  // Wrap in tenant data providers here once step 8 adds them.
  return <AtlasShell>{children}</AtlasShell>;
}
```

## atlas-shell.tsx

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Nav from "./nav";

const STORAGE_KEY = "atlas-mode";

export default function AtlasShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);
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
      <div
        data-theme="atlas"
        data-mode={mode ?? undefined}
        className="flex h-full min-h-screen flex-1 flex-col bg-bg text-text font-body"
      >
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div
      data-theme="atlas"
      data-mode={mode ?? undefined}
      className="flex h-full min-h-screen flex-1 flex-col bg-bg text-text font-body md:flex-row"
    >
      <Nav mode={mode} onToggleMode={toggleMode} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
```

## page.tsx

```tsx
import type { Metadata } from "next";
import Home from "./Home";

export const metadata: Metadata = {
  title: "Atlas | Origo",
  description: "Origo",
};

export default function AtlasPage() {
  return <Home />;
}
```

## Home.tsx

```tsx
"use client";

import { Card } from "../components/ui/Card";

export default function Home() {
  return (
    <div className="p-6">
      <Card className="flex flex-col gap-3">
        <h1 className="m-0 font-display text-2xl font-semibold text-text">Atlas</h1>
        <p className="text-text-muted">Welcome to Atlas.</p>
      </Card>
    </div>
  );
}
```

## login/page.tsx

```tsx
import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";
import { TENANTS } from "@/app/lib/tenant";
import { Card } from "@/app/components/ui/Card";
import { LogoMark } from "@/app/atlas/ui/LogoMark";

export const metadata: Metadata = {
  title: `Logga in | ${TENANTS.atlas.name}`,
  description: `Logga in på ${TENANTS.atlas.name}`,
};

export default function AtlasLoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-16 py-32">
      <Card className="-translate-y-20 flex w-full max-w-sm flex-col items-center gap-6 p-8">
        <LogoMark />
        <LoginForm redirectTo="/" />
      </Card>
    </div>
  );
}
```

## ui/Logo.tsx

```tsx
const Logo = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" {...props}>
    {/* brand path(s); use fill="currentColor" so text-accent colors it */}
    <circle cx="50" cy="50" r="40" fill="currentColor" />
  </svg>
);

export default Logo;
```

## ui/LogoMark.tsx

```tsx
import { TENANTS } from "@/app/lib/tenant";
import Logo from "@/app/atlas/ui/Logo";

export function LogoMark() {
  return (
    <div className="flex flex-col items-center gap-1">
      <Logo className="h-32 w-auto text-accent" />
      <h1 className="text-4xl font-semibold text-accent">{TENANTS.atlas.name}</h1>
    </div>
  );
}
```

## nav.tsx (minimal)

```tsx
"use client";

import Link from "next/link";
import { Icon } from "@/app/components/ui/Icon";
import { logout } from "@/app/actions/auth";
import Logo from "./ui/Logo";

type NavProps = { mode: "light" | "dark" | null; onToggleMode: () => void };

const LINKS = [{ label: "Hem", href: "/", icon: "home" }];

export default function Nav({ mode, onToggleMode }: NavProps) {
  return (
    <nav className="flex items-center justify-between border-b border-border bg-surface px-4 py-2 md:h-screen md:w-56 md:flex-col md:items-stretch md:border-r md:border-b-0">
      <Link href="/" className="flex items-center gap-1 font-display text-lg font-semibold text-accent">
        <Logo className="h-8 w-8" />
        Atlas
      </Link>
      <div className="flex gap-1 md:mt-4 md:flex-col">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded px-3 py-2 text-text hover:bg-accent-wash hover:text-accent">
            <Icon name={l.icon} size={18} />
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex gap-1 md:mt-auto md:flex-col">
        <button type="button" onClick={onToggleMode} className="flex items-center gap-2 rounded px-3 py-2 text-text hover:bg-accent-wash">
          <Icon name={mode === "dark" ? "sun" : "moon"} size={18} />
        </button>
        <button type="button" onClick={() => logout()} className="flex items-center gap-2 rounded px-3 py-2 text-text hover:bg-accent-wash">
          <Icon name="log-out" size={18} />
        </button>
      </div>
    </nav>
  );
}
```
