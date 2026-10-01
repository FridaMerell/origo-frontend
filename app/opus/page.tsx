import HomeView from "./HomeView"
import { getCurrentUser } from "../lib/dal"
import { readingProgressApi } from "./_actions/actions"

export const metadata = {
	title: "Opus - läs böcker i flera utgåvor | Origo Fåvitsko",
	description:
		"Ladda upp texter i flera utgåvor och jämför översättningar genom tiderna",
}

export default async function HomePage() {
	// Var man senast var i varje bok, för "Senast: …" på korten. Utloggad: inga.
	const user = await getCurrentUser()
	const progress = user ? await readingProgressApi.list().catch(() => []) : []
	return <HomeView progress={progress} />
}
