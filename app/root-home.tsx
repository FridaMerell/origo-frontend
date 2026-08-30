"use client";

import { useEffect, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { logout } from "@/app/actions/auth";
import { useUser } from "@/app/lib/user-context";
import { APP_LINKS, appHref } from "@/app/lib/tenant-links";
import apsisIcon from "./apsis/icon.png";
import fluxIcon from "./flux/icon.png";
import tempusIcon from "./tempus/icon.png";
import versoIcon from "./verso/icon.png";

const APP_ICONS: Record<string, StaticImageData> = {
  apsis: apsisIcon,
  flux: fluxIcon,
  tempus: tempusIcon,
  verso: versoIcon,
};

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
    <div className="container flex flex-1 flex-col items-center justify-center gap-10 bg-zinc-50 py-24 font-sans dark:bg-black">
      <h1 className="font-display text-3xl text-zinc-900 dark:text-zinc-100">Origo</h1>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {apps.map((app) => (
          <a
            key={app.id}
            href={hrefs[app.id] ?? "#"}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 no-underline transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
              <Image
                src={APP_ICONS[app.id]}
                alt=""
                width={36}
                height={36}
                className="size-full object-contain"
              />
            </span>
            <span>{app.name}</span>
          </a>
        ))}
      </div>

      {user && (
        <div className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
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
