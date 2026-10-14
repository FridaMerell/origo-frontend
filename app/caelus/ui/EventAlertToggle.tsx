"use client"

import { useEffect, useMemo, useState } from "react"
import {
	getEventAlert,
	removeEventAlert,
	saveEventAlert,
	type EventAlertPosition,
} from "@/app/actions/caelus"
import { isPushSupported } from "@/app/lib/push-client"
import { hasWorker, subscribeAndSave } from "@/app/lib/use-push-notifications"
import { parsePosition, POSITION_KEY, UPPSALA } from "./SkyChart"
import { useStored } from "./use-stored"

// Varningen kommer som pushnotis när webbläsaren tillåter det, annars som e-post. Att den inte
// får bli push stoppar alltså inte varningarna.
async function enablePush() {
	if (!isPushSupported() || Notification.permission === "denied" || !(await hasWorker())) return
	await subscribeAndSave().catch(() => {})
}

/**
 * Varningar tre dagar innan något ovanligt händer på himlen, för platsen kartan visar. En rad i
 * menyn, med menyns klasser i `item`; bara för inloggade.
 */
export default function EventAlertToggle({ item }: { item: string }) {
	const [storedPosition] = useStored(POSITION_KEY)
	const position = useMemo(() => parsePosition(storedPosition) ?? UPPSALA, [storedPosition])
	// Platsen varningarna gäller för; null är avslaget och undefined att det inte är hämtat än.
	const [saved, setSaved] = useState<EventAlertPosition | null | undefined>(undefined)
	const [busy, setBusy] = useState(false)

	// Går läsningen fel förblir raden låst, i stället för att visa Av.
	useEffect(() => {
		getEventAlert().then(setSaved, () => {})
	}, [])

	// När platsen byts på kartan följer varningarna med.
	useEffect(() => {
		if (!saved || (saved.latitude === position.latitude && saved.longitude === position.longitude)) return
		void saveEventAlert(position).then(result => {
			if (result.ok) setSaved(position)
		})
	}, [saved, position])

	const on = Boolean(saved)
	const flip = async () => {
		setBusy(true)
		if (on) {
			if ((await removeEventAlert()).ok) setSaved(null)
		} else if ((await saveEventAlert(position)).ok) {
			setSaved(position)
			await enablePush()
		}
		setBusy(false)
	}

	return (
		<button
			type='button'
			aria-pressed={on}
			disabled={saved === undefined || busy}
			onClick={() => void flip()}
			className={`${item} flex cursor-pointer items-baseline justify-between gap-4 disabled:cursor-default`}>
			Varningar
			<span className='text-sm uppercase tracking-[0.16em]'>{on ? "På" : "Av"}</span>
		</button>
	)
}
