import { workApi, type NewTextVersion, type NewWorkDetails } from "@/app/opus/_actions/actions"
import { getSessionCookies } from "@/app/lib/session"

type CreateRequest = {
	work: NewWorkDetails
	editions: NewTextVersion[]
}

/** Creates a work and its editions using the server-held session and CSRF credentials. */
export async function POST(request: Request) {
	const { sessionId } = await getSessionCookies()
	if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 })

	const payload = await request.json() as CreateRequest
	const result = await workApi.createWithEditions(payload.work, payload.editions)
	return Response.json(result, { status: result.error ? 400 : 201 })
}
