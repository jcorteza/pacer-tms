import { useState } from 'react'

export type Errors<T> = Partial<Record<keyof T, string>>

/** Form state: values, per-field errors, and a setter per field that clears that field's error. */
export function useForm<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors<T>>({})

  const set = <K extends keyof T>(key: K) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  return { values, setValues, errors, setErrors, set }
}

/** "<Label> is required." for each blank field. */
export function requiredErrors<T extends Record<string, string>>(values: T, labels: Partial<Record<keyof T, string>>): Errors<T> {
  const errors: Errors<T> = {}
  for (const key of Object.keys(labels) as (keyof T)[]) {
    if (!values[key].trim()) errors[key] = `${labels[key]} is required.`
  }
  return errors
}

export const hasErrors = (errors: object) => Object.values(errors).some(Boolean)

/** Only the fields whose value differs from where the form started, for a PATCH. */
export function changedFields<T extends Record<string, string>>(values: T, initial: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => value.trim() !== initial[key].trim())) as Partial<T>
}
