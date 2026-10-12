import SkyChart from "./ui/SkyChart"

export default function CaelusPage() {
	return (
		<main className='flex min-h-0 flex-1 flex-col'>
			<h1 className='sr-only'>Stjärnhimlen</h1>
			<SkyChart />
		</main>
	)
}
