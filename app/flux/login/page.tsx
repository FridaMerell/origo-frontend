import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";
import { TENANTS } from "@/app/lib/tenant";
import { Card } from "@/app/components/ui/Card";
import { LogoMark } from "@/app/flux/ui/LogoMark";

export const metadata: Metadata = {
  title: `Sign in | ${TENANTS.flux.name}`,
  description: `Sign in to ${TENANTS.flux.name}`,
};

export default function FluxLoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-16 py-32">
      <Card className="-translate-y-20 flex w-full max-w-sm flex-col items-center gap-6 p-8">
        <LogoMark />
        <LoginForm redirectTo="/" />
      </Card>
    </div>
  );
}
