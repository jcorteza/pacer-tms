import { useId } from 'react'
import { Icon } from './Icon.tsx'

type FieldBase = {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  /** Shown as "(optional)" after the label. */
  optional?: boolean
  error?: string
  hint?: string
}

const labelText = ({ label, required, optional }: Pick<FieldBase, 'label' | 'required' | 'optional'>) =>
  required ? `${label} (required)` : optional ? `${label} (optional)` : label

/** A labelled text input with its hint and error wired up for screen readers. */
export function TextField({
  type = 'text',
  inputMode,
  autoComplete,
  disabled,
  ...field
}: FieldBase & { type?: string; inputMode?: 'numeric' | 'decimal'; autoComplete?: string; disabled?: boolean }) {
  const id = useId()
  const describedBy = [field.hint && `${id}-hint`, field.error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {labelText(field)}
      </label>
      <input
        className="input"
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        disabled={disabled}
        required={field.required}
        value={field.value}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => field.onChange(event.target.value)}
      />
      {field.hint && (
        <span className="hint" id={`${id}-hint`}>
          {field.hint}
        </span>
      )}
      {field.error && (
        <span className="error" id={`${id}-error`}>
          {field.error}
        </span>
      )}
    </div>
  )
}

export type Option = { value: string; label: string }

/** A labelled drop-down; `placeholder` adds an empty first choice such as "Select site". */
export function SelectField({ options, placeholder, ...field }: FieldBase & { options: Option[]; placeholder?: string }) {
  const id = useId()
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {labelText(field)}
      </label>
      <div className="select">
        <select
          className="input"
          id={id}
          required={field.required}
          value={field.value}
          aria-invalid={field.error ? true : undefined}
          aria-describedby={field.error ? `${id}-error` : undefined}
          onChange={(event) => field.onChange(event.target.value)}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron" size={18} />
      </div>
      {field.hint && <span className="hint">{field.hint}</span>}
      {field.error && (
        <span className="error" id={`${id}-error`}>
          {field.error}
        </span>
      )}
    </div>
  )
}
