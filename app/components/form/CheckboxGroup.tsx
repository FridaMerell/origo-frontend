"use client"

import type { FieldError } from "react-hook-form"

export type CheckboxOption<T extends string | number> = { value: T; label: string }

/** Controlled multi-select as checkboxes. Use with react-hook-form's Controller,
 *  since native checkbox groups collapse to a boolean when only one option exists. */
export function CheckboxGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
  emptyText = "Inga alternativ.",
}: {
  label: string
  options: CheckboxOption<T>[]
  value: T[]
  onChange: (value: T[]) => void
  error?: FieldError
  emptyText?: string
}) {
  const toggle = (option: T) =>
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])

  return (
    <fieldset className="flex flex-col gap-1.5 text-sm text-text-muted">
      <legend className="mb-1">{label}</legend>
      {options.length === 0 ? (
        <span className="text-xs text-text-faint">{emptyText}</span>
      ) : (
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input type="checkbox" checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      )}
      {error && <span className="text-xs text-danger">{error.message}</span>}
    </fieldset>
  )
}
