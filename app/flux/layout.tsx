import type { ReactNode } from "react";
import { FluxProviders } from "@/app/lib/flux-providers";
import { getCurrentUser } from "@/app/lib/dal";
import FluxShell from "./flux-shell";

export const metadata = {
  title: "Flux | Origo",
  description: "Origo",
};
export default async function FluxLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const userName =
    typeof user?.first_name === "string" && typeof user?.last_name === "string"
      ? [user.first_name, user.last_name].filter(Boolean).join(" ")
      : typeof user?.username === "string"
        ? user.username
        : typeof user?.email === "string"
          ? user.email
          : "?";

  return (
    <FluxProviders>
      <FluxShell userName={userName || "?"}>{children}</FluxShell>
    </FluxProviders>
  );
}
