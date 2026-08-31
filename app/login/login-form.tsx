"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { login } from "@/app/actions/auth"
import { loginFormSchema, type LoginFormValues } from "@/app/lib/schemas"

export function LoginForm({ redirectTo = "/", buttonClass=null }: { redirectTo?: string, buttonClass?: any }) {
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

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="username">Användarnamn</label>
        <input
          id="username"
          autoComplete="username"
          className="rounded border border-field-border bg-surface px-3 py-2 text-text"
          {...register("username")}
        />
        {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password">Lösenord</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="rounded border border-field-border bg-surface px-3 py-2 text-text"
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`rounded-full  px-5 py-2 transition-colors cursor-pointer ${buttonClass ?? ""}`}
      >
        {isSubmitting ? "Loggar in..." : "Logga in"}
      </button>
    </form>
  )
}
