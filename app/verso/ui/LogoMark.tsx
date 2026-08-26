import { TENANTS } from "@/app/lib/tenant";
import Logo from "@/app/verso/ui/Logo";

export function LogoMark() {
  return (
    <div className="flex flex-col items-center gap-0">
      <Logo className="h-40 w-auto text-accent" />
      <h1 className="-mt-4 text-5xl font-semibold font-display text-accent">{TENANTS.verso.name}</h1>
    </div>
  );
}
