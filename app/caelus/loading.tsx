// Ritas inuti plåtramen, på samma plats som stjärnkartans egen väntetext, så att ingenting
// hoppar när sidan tar över.
export default function Loading() {
	return (
		<div role='status' className='relative flex-1'>
			<p className='absolute inset-x-0 top-1/3 text-center text-lg italic text-text-muted'>
				Väntar på mörkret …
			</p>
		</div>
	)
}
