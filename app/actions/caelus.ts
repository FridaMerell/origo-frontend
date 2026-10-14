"use server"

import { fetchOrigoApi } from "@/app/lib/api-client"
import { firstErrorMessage } from "@/app/lib/api-errors"
import { authedJsonHeaders } from "@/app/lib/auth-headers"

const EVENT_ALERT = "/api/caelus/event-alert/"

export type EventAlertPosition = { latitude: number; longitude: number }
export type EventAlertResult = { ok: boolean; error?: string }

/**
 * Platsen varningarna gäller, eller null om användaren inte har slagit på dem. Andra fel kastas,
 * så att de inte ser ut som att varningarna är av.
 */
export async function getEventAlert(): Promise<EventAlertPosition | null> {
	const response = await fetchOrigoApi(EVENT_ALERT, {
		headers: await authedJsonHeaders(),
		cache: "no-store",
	})
	if (response.status === 404) return null
	if (!response.ok) throw new Error(`Kunde inte läsa varningarna (${response.status}).`)
	const { latitude, longitude } = (await response.json()) as EventAlertPosition
	return { latitude, longitude }
}

/** Slår på varningarna, eller flyttar dem till en ny plats. */
export async function saveEventAlert(position: EventAlertPosition): Promise<EventAlertResult> {
	const response = await fetchOrigoApi(EVENT_ALERT, {
		method: "PUT",
		headers: await authedJsonHeaders(),
		body: JSON.stringify(position),
	})
	if (!response.ok) {
		return { ok: false, error: firstErrorMessage(await response.text().catch(() => ""), response.status) }
	}
	return { ok: true }
}

export async function removeEventAlert(): Promise<EventAlertResult> {
	const response = await fetchOrigoApi(EVENT_ALERT, {
		method: "DELETE",
		headers: await authedJsonHeaders(),
	})
	if (!response.ok) {
		return { ok: false, error: firstErrorMessage(await response.text().catch(() => ""), response.status) }
	}
	return { ok: true }
}
