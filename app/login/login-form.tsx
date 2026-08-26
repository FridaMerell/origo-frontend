"use client";

import { useActionState, useEffect } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  useEffect(() => {
    if (state?.success) {
      window.location.href = redirectTo;
    }
  }, [state, redirectTo]);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          className="rounded border border-field-border bg-surface px-3 py-2 text-text"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded border border-field-border bg-surface px-3 py-2 text-text"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-foreground px-5 py-2 text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
