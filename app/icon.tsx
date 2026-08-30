import { headers } from "next/headers";
import { resolveTenant } from "@/app/lib/tenant";

const ICONS = {
  apsis: {
    background: "#EDE7D8",
    href: "/apsis/icon.svg",
  },
  flux: {
    background: "#EEF3F5",
    href: "/flux/icon.svg",
  },
  tempus: {
    background: "#F3EDDF",
    href: "/tempus/longhorn-beetle.svg",
  },
  verso: {
    background: "#F6EFDC",
    href: "/verso/icon",
  },
} as const;

export const contentType = "image/svg+xml";

export default async function Icon() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "";
  const tenant = resolveTenant(host) ?? "verso";
  const icon = ICONS[tenant];

  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="${tenant} favicon"><rect width="32" height="32" rx="7" fill="${icon.background}" /><image href="${icon.href}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" /></svg>`,
    {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    },
  );
}
