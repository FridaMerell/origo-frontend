import { ReactNode, Suspense } from "react"
import { Cormorant_Garamond } from "next/font/google"
import { NavProgressBar } from "../lib/nav-progress"
import { ThemeScope } from "../components/ui/ThemeScope"
import PlateFrame from "./ui/PlateFrame"
import Loading from "./loading"

const cormorant = Cormorant_Garamond({
	variable: "--font-caelus-cormorant",
	subsets: ["latin", "latin-ext"],
	weight: ["400", "500", "600"],
	style: ["normal", "italic"],
	display: "swap",
})

export const metadata = {
	title: "Caelus | Origo",
	description: "Stjärnhimlen, med Kp-index och molnighet.",
}

export default function CaelusLayout({ children }: { children: ReactNode }) {
	return (
		<ThemeScope
			theme='caelus'
			className={`${cormorant.variable} flex min-h-screen flex-1 flex-col bg-bg font-body text-base text-text`}>
			<NavProgressBar />
			{/* Ramen står kvar även medan sidan läses in, så bara innehållet byts. */}
			<PlateFrame>
				<Suspense fallback={<Loading />}>{children}</Suspense>
			</PlateFrame>
		</ThemeScope>
	)
}
