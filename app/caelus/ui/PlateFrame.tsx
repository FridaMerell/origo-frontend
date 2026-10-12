import type { ReactNode } from "react"
import CaelusMenu from "./CaelusMenu"

// Gradskalan mellan ramens två linjer, som i kanten på en stjärnatlas plåt: ett långt streck
// var 30:e px och ett kort var 6:e, hängande från den inre linjen.
const SCALE_X =
	"border-x border-text bg-[linear-gradient(90deg,var(--text)_1px,transparent_1px),linear-gradient(90deg,var(--text)_1px,transparent_1px)] bg-size-[30px_100%,6px_50%] bg-repeat-x"
const SCALE_Y =
	"border-y border-text bg-[linear-gradient(0deg,var(--text)_1px,transparent_1px),linear-gradient(0deg,var(--text)_1px,transparent_1px)] bg-size-[100%_30px,50%_6px] bg-repeat-y"

/**
 * Plåten som hela Caelus ryms i: en enda graverad ram med gradskala. Ramen fyller fönstret
 * och innehållet rullar inuti den.
 */
export default function PlateFrame({ children }: { children: ReactNode }) {
	return (
		<div className='flex h-dvh flex-col bg-bg p-2 sm:p-4'>
			<div className='grid min-h-0 flex-1 grid-cols-[8px_minmax(0,1fr)_8px] grid-rows-[8px_minmax(0,1fr)_8px] border border-text sm:grid-cols-[10px_minmax(0,1fr)_10px] sm:grid-rows-[10px_minmax(0,1fr)_10px]'>
				<span aria-hidden />
				<span aria-hidden className={`${SCALE_X} bg-bottom`} />
				<span aria-hidden />
				<span aria-hidden className={`${SCALE_Y} bg-right`} />
				<div className='relative flex min-h-0 flex-col border border-text'>
					<CaelusMenu />
					<div className='flex min-h-0 flex-1 flex-col overflow-auto'>
						{children}
					</div>
				</div>
				<span aria-hidden className={`${SCALE_Y} bg-left`} />
				<span aria-hidden />
				<span aria-hidden className={`${SCALE_X} bg-top`} />
				<span aria-hidden />
			</div>
		</div>
	)
}
