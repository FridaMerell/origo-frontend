import { alignmentSetApi, alignmentVersionApi } from "./actions"
import type { AlignmentSet } from "@/app/lib/dal/opus"

type EditionRef = { id: number; title: string }

/**
 * Skapar (eller kompletterar) verkets AlignmentSet med en AlignmentVersion per edition.
 * Anropas ENDAST från riktiga mutationer (skapa verk, lägga till edition) — aldrig från
 * en sidas render/GET-väg, eftersom Next.js prefetchar länkar vid hover och skulle
 * trigga dubbletter varje gång pekaren rör sig över en länk.
 */
export async function ensureAlignmentSet(
	workId: number,
	workTitle: string,
	editions: EditionRef[],
): Promise<void> {
	if (editions.length === 0) return

	const sets = await alignmentSetApi.list({ work: String(workId) })
	let set: AlignmentSet | undefined = sets[0]
	if (!set) {
		set = await alignmentSetApi.create({
			work: workId,
			name: `${workTitle} – alignment`,
			is_public: false,
			status: "draft",
			// Legacy parvisa fält; servern kräver att de skiljer sig åt, så bara med två editions.
			...(editions.length >= 2 ? { source_version: editions[0].id, target_version: editions[1].id } : {}),
		})
	}

	const versions = await alignmentVersionApi.list({ alignment_set: String(set.id) })
	const existingEditionIds = new Set(versions.map(v => v.text_version))
	const missing = editions.filter(edition => !existingEditionIds.has(edition.id))
	if (missing.length === 0) return

	await Promise.all(
		missing.map((edition, index) =>
			alignmentVersionApi.create({
				alignment_set: set!.id,
				text_version: edition.id,
				display_order: versions.length + index,
				label: edition.title,
			}),
		),
	)
}
