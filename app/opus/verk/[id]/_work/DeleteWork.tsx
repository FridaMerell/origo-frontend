"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { TrashIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"

/**
 * Raderar verket och går sedan till Opus startsida. Navigeringen sker i klienten: en
 * `redirect("/")` i server actionen renderar "/" direkt, förbi proxy.ts omskrivning till
 * tenantens rutt, och hamnar då på rotdomänens startsida i stället för Opus.
 */
export default function DeleteWork({ onDelete }: { onDelete: () => Promise<void> }) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()

	return (
		<Button
			type={"button"}
			variant={"secondary"}
			disabled={pending}
			onClick={() =>
				startTransition(async () => {
					await onDelete()
					router.push("/")
				})
			}>
			<TrashIcon className={"w-4 h-4 text-primary-contrast"} />
			Radera
		</Button>
	)
}
