import { ReactNode, Suspense } from "react"
import { NavProgressBar } from "../lib/nav-progress"
import { TENANT_FONTS } from "../lib/tenant-fonts"
import { Splash } from "../components/ui/Splash"
import OpusShell from "./opus-shell"
import { MODE_KEYS } from "../components/ui/mode-keys"
import { readStoredMode } from "../lib/color-mode"
import { OpusDataProvider } from "./_state/opus-context"
import { workApi } from "./_actions/actions"
import { getCurrentUser } from "../lib/dal"
import { getSelectedWork } from "./_state/opus-data"

export default async function OpusLayout({
	children,
}: {
	children: ReactNode
}) {
	const user = await getCurrentUser()
	const works = user ? await workApi.list() : []
	const selectedWork = user ? await getSelectedWork() : null
	const initialMode = await readStoredMode(MODE_KEYS.opus)

	return (
		<div
			data-theme='opus'
			data-mode={initialMode ?? "light"}
			className={`${TENANT_FONTS.opus} flex flex-1 flex-col bg-bg font-body text-text`}>
			<NavProgressBar />
			<Suspense fallback={<Splash tenant='opus' />}>
				<OpusDataProvider
					works={works}
					selectedWork={selectedWork}>
					<OpusShell initialMode={initialMode}>{children}</OpusShell>
				</OpusDataProvider>
			</Suspense>
		</div>
	)
}
