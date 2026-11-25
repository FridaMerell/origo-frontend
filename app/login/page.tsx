import type { Metadata } from "next"
import { LoginForm } from "@/app/login/login-form"
import { Section } from "../konto/ui"

export const metadata: Metadata = {
  title: "Logga in | Origo",
  description: "Logga in på Origo för att komma åt dina appar och din data.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>
}) {
  const { redirect } = await searchParams
  const redirectTo = typeof redirect === "string" ? redirect : "/"

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-black  py-32 font-sans bg-[#E7E5DE] ">
      <Section title={'Logga in'}>
        <p className="text-dimmed">
          Logga in i Origo för åtkomst till samtliga sidor
        </p>
        <LoginForm redirectTo={redirectTo} />
      </Section>
    </div>
  )
}
