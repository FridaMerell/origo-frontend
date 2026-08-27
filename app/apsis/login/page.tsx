import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";
import { TENANTS } from "@/app/lib/tenant";
import { Card } from "@/app/components/ui/Card";
import { LogoMark } from "@/app/apsis/ui/LogoMark";

export const metadata: Metadata = {
  title: `Logga in | ${TENANTS.apsis.name}`,
  description: `Logga in på ${TENANTS.apsis.name}`,
};

export default function ApsisLoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-6 py-24">
      <Card className="flex w-full max-w-sm flex-col items-center gap-6 p-8">
        <LogoMark />
        <LoginForm redirectTo="/" />
      </Card>
    </div>
  );
}
