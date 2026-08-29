// Data access layer. Split by domain under ./dal/*; this barrel keeps the
// existing `@/app/lib/dal` import path working.
export type { QueryParams } from "@/app/lib/dal/client"
export * from "@/app/lib/dal/auth"
export * from "@/app/lib/dal/verso"
export * from "@/app/lib/dal/flux"
export * from "@/app/lib/dal/apsis"
export * from "@/app/lib/dal/tempus"
