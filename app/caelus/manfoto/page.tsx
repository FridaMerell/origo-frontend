import type { Metadata } from "next"
import { TENANTS } from "@/app/lib/tenant"
import MoonPhoto from "../ui/MoonPhoto"

export const metadata: Metadata = {
	title: `Månfoto | ${TENANTS.caelus.name}`,
	description: "När och var månen går upp och ner, och i vilket ljus.",
}

/** Månfoto: månens upp- och nedgångar de kommande 30 dagarna, för fotografering. */
export default function MoonPhotoPage() {
	return (
		<main className='flex min-h-0 flex-1 flex-col'>
			<h1 className='sr-only'>Månfoto</h1>
			<MoonPhoto />
		</main>
	)
}
