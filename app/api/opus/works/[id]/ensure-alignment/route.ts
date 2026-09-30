import { workApi } from "@/app/opus/_actions/actions"
import { ensureAlignmentSet } from "@/app/opus/_actions/alignment-bootstrap"
import { getSessionCookies } from "@/app/lib/session"

/**
 * Backfyller AlignmentSet/AlignmentVersion för verk som fick sina editions innan
 * bootstrap-logiken fanns. Anropas ENDAST från ett client-mount-useEffect (se
 * AlignmentBootstrap.tsx) — aldrig från en sidas render/GET-väg. En useEffect körs
 * bara efter en riktig hydrering i webbläsaren, inte vid Next.js hover-prefetch av en
 * länk, så det finns ingen risk att det triggas av att bara peka på en länk.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { sessionId } = await getSessionCookies()
	if (!sessionId) return Response.json({ error: "Unauthorized" }, { status: 401 })

	const { id } = await params
	const workId = Number(id)
	if (!Number.isFinite(workId)) return Response.json({ error: "Invalid work id" }, { status: 400 })

	const work = await workApi.retrieve(workId)
	await ensureAlignmentSet(
		workId,
		work.title,
		work.editions.map(edition => ({ id: edition.id, title: edition.title })),
	)
	return Response.json({ ok: true })
}
