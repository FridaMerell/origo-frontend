import { LoginForm } from "@/app/login/login-form";
import { TENANTS } from "@/app/lib/tenant";

export default function VersoLoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-16 py-32">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>
        Sign in to {TENANTS.verso.name}
      </h1>
      <LoginForm />
    </div>
  );
}
