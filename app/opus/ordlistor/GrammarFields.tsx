"use client"

import type { FormGrammar } from "@/app/lib/dal/opus"
import { SelectField } from "../forms/Fields/Fields"
import { GRAMMAR_KEYS, GRAMMAR_LABELS, GRAMMAR_OPTIONS } from "./lexical-forms"

/** Valen för en böjd forms strukturerade egenskaper (kasus, numerus, tempus…), alla valfria. */
export default function GrammarFields({
	value,
	onChange,
	className = "grid grid-cols-2 gap-2",
}: {
	value: FormGrammar
	onChange: (next: FormGrammar) => void
	className?: string
}) {
	return (
		<div className={className}>
			{GRAMMAR_KEYS.map(key => (
				<SelectField
					key={key}
					label={GRAMMAR_LABELS[key]}
					value={value[key]}
					onChange={event => onChange({ ...value, [key]: event.target.value })}>
					<option value=''>–</option>
					{GRAMMAR_OPTIONS[key].map(option => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</SelectField>
			))}
		</div>
	)
}
