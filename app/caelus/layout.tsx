import { ReactNode, Suspense } from "react"
import { NavProgressBar } from "../lib/nav-progress"
import { TENANT_FONTS } from "../lib/tenant-fonts"
import CaelusTheme from "./ui/CaelusTheme"
import PlateFrame from "./ui/PlateFrame"
import Loading from "./loading"

export const metadata = {
	title: "Caelus | Origo",
	description: "Stjärnhimlen, med Kp-index och molnighet.",
}

export default function CaelusLayout({ children }: { children: ReactNode }) {
	return (
		<CaelusTheme
			className={`${TENANT_FONTS.caelus} flex min-h-screen flex-1 flex-col bg-bg font-body text-base text-text`}>
			<NavProgressBar />
			{/* Ramen står kvar även medan sidan läses in, så bara innehållet byts. */}
			<PlateFrame>
				<Suspense fallback={<Loading />}>{children}</Suspense>
			</PlateFrame>
		</CaelusTheme>
	)
}
