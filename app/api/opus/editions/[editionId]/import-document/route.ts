import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

/** Proxies an edition import while adding the server-held session and CSRF credentials. */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ editionId: string }> },
) {
	const { editionId } = await params
	if (!/^\d+$/.test(editionId)) return Response.json({ error: "Invalid edition id" }, { status: 400 })

	const { sessionId, csrfToken } = await getSessionCookies()
	if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 })

	const formData = await request.formData()
	if (!(formData.get("file") instanceof File)) return Response.json({ error: "No file provided" }, { status: 400 })

	const response = await fetchOrigoApi(`/api/opus/editions/${editionId}/import-document/`, {
		method: "POST",
		headers: {
			"X-CSRFToken": csrfToken ?? "",
			Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
		},
		body: formData,
	})

	return new Response(response.body, {
		status: response.status,
		headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
	})
}
