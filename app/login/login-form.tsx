"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { login } from "@/app/actions/auth"
import { loginFormSchema, type LoginFormValues } from "@/app/lib/schemas"
import { ERROR_TEXT, INPUT, LABEL } from "../konto/ui"

type LoginFormProps = {
  redirectTo?: string
  buttonClass?: string
  variant?: "origo" | "tenant"
}

export function LoginForm({
  redirectTo = "/",
  buttonClass = "",
  variant = "origo",
}: LoginFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  })

  const onSubmit = handleSubmit(async (data) => {
    const result = await login(data)
    if (result?.error) {
      setError("root", { message: result.error })
      return
    }
    window.location.href = redirectTo
  })

  const usesTenantTheme = variant === "tenant"
  const labelClass = usesTenantTheme
    ? "text-sm font-medium text-text"
    : LABEL
  const inputClass = usesTenantTheme
    ? "rounded-md border border-field-border bg-surface-raised px-3 py-2 text-text outline-none transition-colors placeholder:text-text-faint focus:border-focus-ring focus:ring-2 focus:ring-focus-ring/20 disabled:opacity-50"
    : INPUT
  const errorClass = usesTenantTheme ? "text-sm text-danger" : ERROR_TEXT
  const submitClass = usesTenantTheme
    ? "rounded-md bg-accent px-5 py-2 font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
    : "rounded-sm border px-5 py-2 transition-colors cursor-pointer"

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Användarnamn</span>
        <input className={inputClass} autoComplete="username" {...register("username")} />
        {errors.username && <span className={errorClass}>{errors.username.message}</span>}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Lösenord</span>
        <input
          className={inputClass}
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && <span className={errorClass}>{errors.password.message}</span>}
      </label>
      {errors.root && <p className={errorClass}>{errors.root.message}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`${submitClass} ${buttonClass}`}
      >
        {isSubmitting ? "Loggar in..." : "Logga in"}
      </button>
    </form>
  )
}
