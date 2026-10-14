import { getMeteorShowers } from "@/app/lib/dal/caelus"
import SkyChart from "./ui/SkyChart"

export default async function CaelusPage() {
	const meteorShowers = await getMeteorShowers()
	return (
		<main className='flex min-h-0 flex-1 flex-col'>
			<h1 className='sr-only'>Stjärnhimlen</h1>
			<SkyChart meteorShowers={meteorShowers} />
		</main>
	)
}
