import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";
import { TENANTS } from "@/app/lib/tenant";
import { Card } from "@/app/components/ui/Card";
import { LogoMark } from "@/app/verso/ui/LogoMark";

export const metadata: Metadata = {
  title: `Sign in | ${TENANTS.verso.name}`,
  description: `Sign in to ${TENANTS.verso.name}`,
};

export default async function VersoLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const { redirect } = await searchParams;
  const redirectTo = typeof redirect === "string" ? redirect : "/";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-16 py-32 dark:text-white">
      <Card className="flex w-full max-w-sm flex-col items-center gap-6 p-8 text-white">
        <LogoMark />
        <LoginForm redirectTo={redirectTo} variant="tenant" buttonClass="font-display" />
      </Card>
    </div>
  );
}
