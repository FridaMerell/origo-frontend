import { shelfApi } from "@/app/opus/_actions/actions"
import { getSessionCookies } from "@/app/lib/session"

export async function GET() {
	const { sessionId } = await getSessionCookies()
	if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 })
	return Response.json(await shelfApi.list())
}

export async function POST(request: Request) {
	const { sessionId } = await getSessionCookies()
	if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 })

	const { name } = await request.json() as { name?: unknown }
	if (typeof name !== "string" || !name.trim()) return Response.json({ error: "Ange hyllans namn." }, { status: 400 })
	return Response.json(await shelfApi.create({ name: name.trim() }), { status: 201 })
}
