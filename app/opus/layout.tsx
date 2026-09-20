import { ReactNode, Suspense } from "react"
import { NavProgressBar } from "../lib/nav-progress"
import { Splash } from "../components/ui/Splash"
import OpusShell from "./opus-shell"

export default function OpusLayout({ children }: { children: ReactNode }) {
	return (
		<div data-theme='opusclassName="flex flex-1 flex-col bg-bg font-body text-text'>
			<NavProgressBar />

			<Suspense fallback={<Splash tenant='opus' />}>
				<OpusShell>{children}</OpusShell>
			</Suspense>
		</div>
	)
}
