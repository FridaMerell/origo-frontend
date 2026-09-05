import type { Metadata } from "next"
import { LoginForm } from "@/app/login/login-form"
import { Section } from "../konto/ui"

export const metadata: Metadata = {
  title: "Sign in | Origo",
  description: "Sign in to Origo",
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-black  py-32 font-sans bg-[#E7E5DE] ">
      <Section title={'Logga in'}>
        <p className="text-dimmed">
          Logga in i Origo för åtkomst till samtliga sidor
        </p>
        <LoginForm />
      </Section>
    </div>
  )
}
