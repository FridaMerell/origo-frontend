import type { Metadata } from "next"
import { LoginForm } from "@/app/login/login-form"
import { TENANTS } from "@/app/lib/tenant"
import OrionChart from "../ui/OrionChart"

export const metadata: Metadata = {
	title: `Logga in | ${TENANTS.caelus.name}`,
	description: `Logga in på ${TENANTS.caelus.name}`,
}

export default async function CaelusLoginPage({
	searchParams,
}: {
	searchParams: Promise<{ redirect?: string | string[] }>
}) {
	const { redirect } = await searchParams
	const redirectTo = typeof redirect === "string" ? redirect : "/"

	return (
		<main className='grid flex-1 lg:grid-cols-2'>
			<figure className='order-last flex flex-col lg:order-none items-center justify-center gap-6 p-8 sm:p-12'>
				<OrionChart className='h-64 w-auto text-text sm:h-96 lg:h-[min(60dvh,34rem)]' />
				<figcaption className='text-center'>
					<span className='block font-display text-2xl uppercase tracking-[0.3em] text-text'>
						Orion
					</span>
					<span className='mt-1 block text-base italic text-text-muted'>
						α Orionis, Betelgeuse, i jägarens axel
					</span>
				</figcaption>
			</figure>

			<section className='flex flex-col justify-center p-8 sm:p-12 lg:p-16'>
				<div className='w-full max-w-md'>
					<h1 className='font-display text-3xl font-medium italic text-text'>
						Logga in
					</h1>
					<p className='mt-2 text-base text-text-muted'>
						Använd dina Origo-uppgifter för att se kvällens himmel.
					</p>
					<div className='mt-8 border-t border-text pt-8'>
						<LoginForm redirectTo={redirectTo} variant='tenant' />
					</div>
				</div>
			</section>
		</main>
	)
}
