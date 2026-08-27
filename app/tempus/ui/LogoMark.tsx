import { TENANTS } from "@/app/lib/tenant";
import Logo from "@/app/tempus/ui/Logo";

export function LogoMark() {
  return (
    <div className="flex flex-col items-center gap-2 text-accent">
      <Logo height={160} />
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {TENANTS.tempus.name}
      </h1>
    </div>
  );
}
