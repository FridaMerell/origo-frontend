"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { login } from "@/app/actions/auth"
import { loginFormSchema, type LoginFormValues } from "@/app/lib/schemas"
import { Field } from "../konto/ui"

export function LoginForm({ redirectTo = "/", buttonClass = null }: { redirectTo?: string, buttonClass?: any }) {
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

    <form onSubmit={onSubmit} className="flex  max-w-md flex-col gap-4">
      <Field label="Användarnamn" error={errors.username}
        autoComplete='username'
        {...register("username")}
      />
      <Field label="Lösenord" {...register("password")} autoComplete="current-password" error={errors.password} />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`rounded-sm font-mono border  px-5 py-2 transition-colors cursor-pointer ${buttonClass ?? ""}`}
      >
        {isSubmitting ? "Loggar in..." : "Logga in"}
      </button>
    </form>
  )
}
