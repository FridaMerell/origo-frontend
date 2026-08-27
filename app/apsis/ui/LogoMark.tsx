import { TENANTS } from "@/app/lib/tenant";
import Logo from "@/app/apsis/ui/Logo";

export function LogoMark() {
  return (
    <div className="flex flex-col items-center gap-3 text-text">
      <Logo height={120} />
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {TENANTS.apsis.name}
      </h1>
    </div>
  );
}
