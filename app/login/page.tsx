import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Sign in | Origo",
  description: "Sign in to Origo",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-16 py-32 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <LoginForm />
    </div>
  );
}
