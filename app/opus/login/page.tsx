import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/app/login/login-form";
import { TENANTS } from "@/app/lib/tenant";
import opusIllustration from "../light.png";

export const metadata: Metadata = {
  title: `Logga in | ${TENANTS.opus.name}`,
  description: `Logga in på ${TENANTS.opus.name}`,
};

export default async function OpusLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const { redirect } = await searchParams;
  const redirectTo = typeof redirect === "string" ? redirect : "/";

  return (
    <main className="container flex flex-1 items-center py-10 sm:py-16">
      <section className="grid w-full overflow-hidden border border-border bg-surface lg:grid-cols-[1.1fr_.9fr]">
        <div className="relative flex min-h-80 flex-col justify-between overflow-hidden bg-surface-2 p-7 text-bg sm:p-10">
          <div className="relative z-10">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Origo · biblioteket
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              Opus
            </h1>
            <p className="mt-4 max-w-md font-display text-xl leading-snug text-bg/80 sm:text-2xl">
              Läs, jämför och följ böckernas många liv.
            </p>
          </div>
          <p className="relative z-10 mt-12 max-w-sm text-sm leading-6 text-bg/70">
            Ditt personliga bibliotek för utgåvor, översättningar och anteckningar.
          </p>
          <Image
            src={opusIllustration}
            alt=""
            priority
            className="pointer-events-none absolute -bottom-8 -right-20 w-100 max-w-none opacity-90 sm:-right-8 sm:w-125"
          />
        </div>

        <div className="flex items-center bg-surface p-7 sm:p-10">
          <div className="w-full">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Välkommen tillbaka
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-text">
              Logga in i Opus
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Använd dina Origo-uppgifter för att fortsätta till ditt bibliotek.
            </p>
            <div className="mt-8 border-t border-border pt-6">
              <LoginForm redirectTo={redirectTo} variant="tenant" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
