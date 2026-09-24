import { ReactNode, Suspense } from "react"
import { Fraunces, Space_Grotesk } from "next/font/google"
import { NavProgressBar } from "../lib/nav-progress"
import { Splash } from "../components/ui/Splash"
import OpusShell from "./opus-shell"
import { OpusDataProvider } from "./_state/opus-context"
import { workApi } from "./_actions/actions"
import { getCurrentUser } from "../lib/dal"
import { getSelectedWork } from "./_state/opus-data"
const fraunces = Fraunces({
	variable: "--font-opus-fraunces",
	subsets: ["latin"],
	style: ["normal", "italic"],
	axes: ["opsz"],
	display: "swap",
})

const spaceGrotesk = Space_Grotesk({
	variable: "--font-opus-space-grotesk",
	subsets: ["latin"],
	display: "swap",
})

export default async function OpusLayout({
	children,
}: {
	children: ReactNode
}) {
	const user = await getCurrentUser()
	const works = user ? await workApi.list() : []
	const selectedWork = user ?  await getSelectedWork(): null



	return (
		<div
			data-theme='opus'
			className={`${fraunces.variable} ${spaceGrotesk.variable} flex flex-1 flex-col bg-bg font-body text-text`}>
			<NavProgressBar />
			<Suspense fallback={<Splash tenant='opus' />}>
				<OpusDataProvider
					works={works}
					selectedWork={selectedWork}
					readingProgress={null}>
					<OpusShell>{children}</OpusShell>
				</OpusDataProvider>
			</Suspense>
		</div>
	)
}
