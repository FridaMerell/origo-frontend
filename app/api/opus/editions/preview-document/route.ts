import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

/** Proxies a document preview (nothing is saved) while adding the server-held session and CSRF credentials. */
export async function POST(request: Request) {
	const { sessionId, csrfToken } = await getSessionCookies()
	if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 })

	const formData = await request.formData()
	if (!(formData.get("file") instanceof File)) return Response.json({ error: "No file provided" }, { status: 400 })

	const response = await fetchOrigoApi("/api/opus/editions/preview-document/", {
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
