import {
	forwardRef,
	InputHTMLAttributes,
	LabelHTMLAttributes,
	TextareaHTMLAttributes,
} from "react"

export const Label = ({
	children,
	className,
	...props
}: LabelHTMLAttributes<HTMLLabelElement>) => {
	return (
		<label
			{...props}
			className={`flex flex-col gap-1.5 font-display text-[11px] italic text-text-faint ${className ?? ""}`}>
			{children}
		</label>
	)
}

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
	({ className, ...props }, ref) => {
		return (
			<input
				ref={ref}
				{...props}
				className={`rounded-none border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none ${className ?? ""}`}
			/>
		)
	},
)
TextField.displayName = "TextField"

export const TitleField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
	({ className, ...props }, ref) => {
		return (
			<input
				ref={ref}
				{...props}
				className={`w-full border-0 bg-transparent text-center font-display text-2xl italic tracking-wide text-text outline-none placeholder:text-text-faint sm:text-3xl ${className ?? ""}`}
			/>
		)
	},
)
TitleField.displayName = "TitleField"

export const SearchField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
	({ className, ...props }, ref) => {
		return (
			<input
				ref={ref}
				{...props}
				type="search"
				className={`min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-sm text-text outline-none placeholder:text-text-faint disabled:opacity-50 ${className ?? ""}`}
			/>
		)
	},
)
SearchField.displayName = "SearchField"

export const TextArea = ({
	className,
	...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => {
	return (
		<textarea
			{...props}
			className={`resize-y rounded-none border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none ${className ?? ""}`}></textarea>
	)
}

export const Checkbox = ({
	children,
	className,
	...props
}: InputHTMLAttributes<HTMLInputElement>) => {
	return (
		<label className='flex items-center gap-2 font-display text-[11px] italic text-text-faint sm:col-span-2'>
			<input
				type='checkbox'
				{...props}
				className={`size-4 accent-accent ${className ?? ""}`}
			/>
			{children}
		</label>
	)
}
