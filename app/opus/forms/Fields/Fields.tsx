import { useId, useState, type ComponentPropsWithoutRef, type DragEvent, type ReactNode } from "react"
import { useCombobox } from "@/app/components/ui/useCombobox"

export type TextFieldProps = Omit<ComponentPropsWithoutRef<"input">, "className"> & {
	label: string
	/** Göm etiketten visuellt (den finns kvar för skärmläsare), t.ex. i en sidnavigering. */
	hideLabel?: boolean
	helpText?: string
	error?: string
	className?: string
}

const fieldClass =
	"w-full rounded-md border border-text bg-bg px-3 py-2.5 font-body text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

function FieldMessage({ id, helpText, error }: { id?: string; helpText?: string; error?: string }) {
	if (!helpText && !error) return null
	return (
		<p id={id} className={`m-0 text-xs leading-relaxed ${error ? "text-danger" : "text-text-muted"}`}>
			{error ?? helpText}
		</p>
	)
}

/** Shared Opus field styling for the compact, rounded library forms. */
export function TextField({
	label,
	hideLabel = false,
	helpText,
	error,
	id,
	className = "",
	...inputProps
}: TextFieldProps) {
	const generatedId = useId()
	const inputId = id ?? generatedId
	const helpId = helpText || error ? `${inputId}-help` : undefined

	return (
		<div className={`flex flex-col ${hideLabel ? "" : "gap-2"}`}>
			<label htmlFor={inputId} className={`font-body text-sm leading-none text-text ${hideLabel ? "sr-only" : ""}`}>
				{label}
			</label>
			<input
				id={inputId}
				aria-describedby={helpId}
				aria-invalid={Boolean(error)}
				className={`${fieldClass} ${error ? "border-danger" : ""} ${className}`}
				{...inputProps}
			/>
			<FieldMessage id={helpId} helpText={helpText} error={error} />
		</div>
	)
}

/** A title is visually the same as the other Opus form fields, with a reusable semantic name. */
export function TitleField({ label = "Namn", ...props }: Omit<TextFieldProps, "label"> & { label?: string }) {
	return <TextField label={label} {...props} />
}

export type TextAreaFieldProps = Omit<ComponentPropsWithoutRef<"textarea">, "className"> & {
	label: string
	helpText?: string
	error?: string
	className?: string
}

export function TextAreaField({
	label,
	helpText,
	error,
	id,
	className = "",
	...textareaProps
}: TextAreaFieldProps) {
	const generatedId = useId()
	const textareaId = id ?? generatedId
	const helpId = helpText || error ? `${textareaId}-help` : undefined

	return (
		<div className='flex flex-col gap-2'>
			<label htmlFor={textareaId} className='font-body text-sm leading-none text-text'>
				{label}
			</label>
			<textarea
				id={textareaId}
				aria-describedby={helpId}
				aria-invalid={Boolean(error)}
				className={`${fieldClass} resize-y ${error ? "border-danger" : ""} ${className}`}
				{...textareaProps}
			/>
			<FieldMessage id={helpId} helpText={helpText} error={error} />
		</div>
	)
}

export type FileFieldProps = Omit<ComponentPropsWithoutRef<"input">, "className" | "type"> & {
	label: string
	className?: string
	onFilesChange?: (files: File[]) => void
}

export function FileField({ label, id, className = "", onFilesChange, ...inputProps }: FileFieldProps) {
	const generatedId = useId()
	const inputId = id ?? generatedId
	const [fileName, setFileName] = useState("")
	const [isDragging, setIsDragging] = useState(false)

	function setFiles(files: FileList | null) {
		const selectedFiles = Array.from(files ?? [])
		setFileName(selectedFiles.length === 1 ? selectedFiles[0].name : selectedFiles.length ? `${selectedFiles.length} filer valda` : "")
		onFilesChange?.(selectedFiles)
	}

	function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault()
		setIsDragging(false)
		setFiles(event.dataTransfer.files)
	}

	return (
		<div className='flex flex-col gap-2'>
			<label htmlFor={inputId} className='font-body text-sm leading-none text-text'>{label}</label>
			<label htmlFor={inputId} onDragEnter={() => setIsDragging(true)} onDragOver={event => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`flex cursor-pointer flex-col gap-1 rounded-md border border-dashed bg-bg px-4 py-3 transition-colors hover:border-primary ${isDragging ? "border-primary bg-primary/5" : "border-text"} ${className}`}>
				<span className='font-body text-sm font-semibold text-primary'>{fileName || (inputProps.multiple ? "Välj filer" : "Välj en fil")}</span>
				<span className='text-xs text-text-muted'>Släpp filer här eller välj från datorn · TXT, Markdown, HTML, PDF, EPUB eller DOCX · max 10 MB</span>
			</label>
			<input id={inputId} type='file' className='sr-only' {...inputProps} onChange={event => { setFiles(event.target.files); inputProps.onChange?.(event) }} />
		</div>
	)
}

export type CheckboxFieldProps = Omit<ComponentPropsWithoutRef<"input">, "className" | "type"> & {
	label: string
	helpText?: string
}

/** Shared Opus checkbox styling, used for compact boolean form choices. */
export function CheckboxField({ label, helpText, id, ...inputProps }: CheckboxFieldProps) {
	const generatedId = useId()
	const inputId = id ?? generatedId

	return (
		<div className='flex flex-col gap-1.5'>
			<label htmlFor={inputId} className='flex cursor-pointer items-center gap-3 font-body text-sm text-text'>
				<input id={inputId} type='checkbox' className='size-4 rounded border-text accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring' {...inputProps} />
				<span>{label}</span>
			</label>
			{helpText && <p className='m-0 pl-7 text-xs leading-relaxed text-text-muted'>{helpText}</p>}
		</div>
	)
}

export type SelectFieldProps = Omit<ComponentPropsWithoutRef<"select">, "className"> & {
	label: string
	/** Göm etiketten visuellt (den finns kvar för skärmläsare), t.ex. när fältet står i en tabellrubrik. */
	hideLabel?: boolean
	helpText?: string
	error?: string
	className?: string
	children: ReactNode
}

export function SelectField({
	label,
	hideLabel = false,
	helpText,
	error,
	id,
	className = "",
	children,
	...selectProps
}: SelectFieldProps) {
	const generatedId = useId()
	const selectId = id ?? generatedId
	const helpId = helpText || error ? `${selectId}-help` : undefined

	return (
		<div className={`flex flex-col ${hideLabel ? "" : "gap-2"}`}>
			<label htmlFor={selectId} className={`font-body text-sm leading-none text-text ${hideLabel ? "sr-only" : ""}`}>
				{label}
			</label>
			<select
				id={selectId}
				aria-describedby={helpId}
				aria-invalid={Boolean(error)}
				className={`${fieldClass} ${error ? "border-danger" : ""} ${className}`}
				{...selectProps}>
				{children}
			</select>
			<FieldMessage id={helpId} helpText={helpText} error={error} />
		</div>
	)
}

/** Ett förslag: `value` hamnar i fältet när det väljs, `label` är det som visas i listan (annars `value`). */
export type ComboboxOption = { key: string | number; value: string; label?: ReactNode }

export type ComboboxFieldProps = Omit<TextFieldProps, "value" | "onChange" | "list"> & {
	value: string
	onValueChange: (value: string) => void
	/** Förslagen i listan. Vilket annat värde som helst går att skriva i fältet. */
	options: (string | ComboboxOption)[]
	/** Falskt när förslagen redan är svaret på det som skrivits (en sökning): då visas alla som de kommer. */
	filterOptions?: boolean
	/** Ett förslag valdes ur listan, efter att `onValueChange` fått dess värde. */
	onPick?: (option: ComboboxOption) => void
}

/**
 * Ett textfält med en lista att välja ur, för värden som oftast men inte alltid är ett av förslagen.
 * Listan visar alla förslag när den öppnas och snävas in först när man skriver. Den har samma
 * utseende som Opus textmenyer.
 */
export function ComboboxField({
	value,
	onValueChange,
	options: givenOptions,
	filterOptions = true,
	onPick,
	...props
}: ComboboxFieldProps) {
	const typed = value.trim().toLocaleLowerCase("sv")
	const lower = (option: ComboboxOption) => option.value.toLocaleLowerCase("sv")
	// Beteendet (öppna, stänga, tangenter, plats över eller under) är det gemensamma i useCombobox.
	const { setWrapper, options, shown, above, active, typed: onTyped, inputProps, listProps, optionProps } =
		useCombobox<ComboboxOption>({
			options: givenOptions.map(option => (typeof option === "string" ? { key: option, value: option } : option)),
			query: value,
			matches: filterOptions ? option => lower(option).includes(typed) : undefined,
			isCurrent: option => lower(option) === typed,
			onPick: option => {
				onValueChange(option.value)
				onPick?.(option)
			},
			// `max-h-48` plus avståndet till fältet.
			listSpace: 200,
		})

	return (
		<div ref={setWrapper} className='relative'>
			<TextField
				{...props}
				{...inputProps}
				value={value}
				onChange={event => {
					onValueChange(event.target.value)
					onTyped()
				}}
			/>
			{shown && (
				<div
					{...listProps}
					className={`absolute left-0 right-0 z-[35] max-h-48 overflow-y-auto rounded-md border border-border bg-surface py-1 text-text shadow-lg ${
						above ? "bottom-full mb-1" : "mt-1"
					}`}>
					{options.map((option, index) => (
						<button
							key={option.key}
							{...optionProps(index)}
							type='button'
							className={`block w-full truncate px-3 py-2 text-left text-sm text-text cursor-pointer ${
								index === active ? "bg-text/10" : ""
							}`}>
							{option.label ?? option.value}
						</button>
					))}
				</div>
			)}
		</div>
	)
}
