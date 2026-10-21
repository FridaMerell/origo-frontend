import { headers } from "next/headers";
import { Splash } from "@/app/components/ui/Splash";
import { MODE_KEYS } from "@/app/components/ui/mode-keys";
import { readStoredMode } from "@/app/lib/color-mode";
import { VERSO_MODE_COOKIE } from "@/app/lib/config";
import { resolveTenant } from "@/app/lib/tenant";
import { TENANT_FONTS } from "@/app/lib/tenant-fonts";

// Shown while an app's own layout is still loading, so it is that app's splash,
// in its typefaces and the visitor's stored mode — the same one the layout's
// fallback shows next, so nothing switches in between.
export default async function Loading() {
  const hostname = (await headers()).get("host")?.split(":")[0] ?? "";
  const tenant = resolveTenant(hostname);
  if (!tenant) return <Splash tenant="origo" />;

  // Opus, Flux and Verso default to light; Tempus, Apsis and Caelus follow the
  // system without a stored choice (Caelus keeps its choice only in the browser).
  const mode =
    tenant === "verso"
      ? ((await readStoredMode(VERSO_MODE_COOKIE)) ?? "light")
      : tenant === "caelus"
        ? null
        : ((await readStoredMode(MODE_KEYS[tenant])) ?? (tenant === "opus" || tenant === "flux" ? "light" : null));

  return (
    <div
      data-theme={tenant}
      data-mode={mode ?? undefined}
      className={`${TENANT_FONTS[tenant]} flex flex-1 flex-col bg-bg font-body text-text`}
    >
      <Splash tenant={tenant} />
    </div>
  );
}
