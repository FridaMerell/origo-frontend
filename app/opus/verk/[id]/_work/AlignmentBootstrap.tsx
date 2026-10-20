"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

/**
 * Backfyller AlignmentSet/AlignmentVersion för verk vars editions saknas i läsarens set,
 * t.ex. editions som fanns innan bootstrap-logiken lades till eller som någon annan lagt
 * till i ett offentligt verk (se app/opus/_actions/alignment-bootstrap.ts).
 *
 * Körs via useEffect, dvs. bara efter en riktig hydrering i webbläsaren — Next.js
 * hover-prefetch av en länk laddar bara RSC-payloaden och kör aldrig client-effekter,
 * så det här triggas aldrig av att bara peka på en länk till verket.
 */
export default function AlignmentBootstrap({
	workId,
	needsBootstrap,
}: {
	workId: number
	needsBootstrap: boolean
}) {
	const router = useRouter()
	const triggered = useRef(false)

	useEffect(() => {
		if (!needsBootstrap || triggered.current) return
		triggered.current = true
		fetch(`/api/opus/works/${workId}/ensure-alignment/`, { method: "POST" })
			.then(() => router.refresh())
			.catch(() => {
				triggered.current = false
			})
	}, [needsBootstrap, workId, router])

	return null
}
