import type { Metadata } from "next"
import { getMeteorShowers } from "@/app/lib/dal/caelus"
import SkyChart from "./ui/SkyChart"

export const metadata: Metadata = {
	title: "Stjärnhimlen | Caelus",
	description: "Stjärnkarta över himlen just nu, med Kp-index, molnighet, meteorregn och planeternas lägen.",
}

export default async function CaelusPage() {
	const meteorShowers = await getMeteorShowers()
	return (
		<main className='flex min-h-0 flex-1 flex-col'>
			<h1 className='sr-only'>Stjärnhimlen</h1>
			<SkyChart meteorShowers={meteorShowers} />
		</main>
	)
}
