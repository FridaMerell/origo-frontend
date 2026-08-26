import { TENANTS } from "@/app/lib/tenant";
import Logo from "@/app/flux/ui/Logo";

export function LogoMark() {
  return (
    <div className="flex flex-col items-center gap-1">
      <Logo className="h-32 w-auto text-accent" />
      <h1 className="text-4xl font-semibold text-accent">{TENANTS.flux.name}</h1>
    </div>
  );
}
