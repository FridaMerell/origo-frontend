"use client";

import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";
import { useUser } from "@/app/lib/user-context";
import { APP_LINKS, appHref } from "@/app/lib/tenant-links";

export default function RootHome() {
  const user = useUser();
  const [hrefs, setHrefs] = useState<Record<string, string>>({});

  useEffect(() => {
    setHrefs(
      Object.fromEntries(APP_LINKS.map((app) => [app.id, appHref(app.id)])),
    );
  }, []);

  const apps = APP_LINKS.filter((app) => app.id !== "origo");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-zinc-50 px-6 py-24 font-sans dark:bg-black">
      <h1 className="font-display text-3xl text-zinc-900 dark:text-zinc-100">Origo</h1>

      <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
        {apps.map((app) => (
          <a
            key={app.id}
            href={hrefs[app.id] ?? "#"}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 no-underline transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <span className="size-2 rounded-sm bg-zinc-400" />
            {app.name}
          </a>
        ))}
      </div>

      {user && (
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>
            Signed in as {String(user.username ?? user.email ?? "user")}
          </span>
          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            className="text-zinc-900 underline dark:text-zinc-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
