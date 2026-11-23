import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

/** Proxies the plain-text export of an edition, adding the server-held session credentials. */
export async function GET(_request: Request, { params }: { params: Promise<{ editionId: string }> }) {
	const { editionId } = await params
	if (!/^\d+$/.test(editionId)) return Response.json({ error: "Invalid edition id" }, { status: 400 })

	const { sessionId, csrfToken } = await getSessionCookies()
	if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 })

	const response = await fetchOrigoApi(`/api/opus/editions/${editionId}/export/`, {
		headers: { Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }) },
	})

	const headers = new Headers({ "Content-Type": response.headers.get("Content-Type") ?? "text/plain" })
	const disposition = response.headers.get("Content-Disposition")
	if (disposition) headers.set("Content-Disposition", disposition)
	return new Response(response.body, { status: response.status, headers })
}
