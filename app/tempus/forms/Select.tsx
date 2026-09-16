import type { SelectHTMLAttributes } from "react"

export default function ({
	children,
	...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			{...props}
			className='rounded-none border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none'>
        {children}
      </select>
	)
}
