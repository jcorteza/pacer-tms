import { useState } from 'react'
import { ApiError } from '../api/client.ts'
import { useAuth } from '../auth/useAuth.ts'
import { TextField } from '../components/fields.tsx'
import { hasErrors, useForm, type Errors } from '../components/form.ts'

const BLANK = { current: '', next: '', confirm: '' }
type Values = typeof BLANK

function validate({ current, next, confirm }: Values): Errors<Values> {
  const errors: Errors<Values> = {}
  if (!current) errors.current = 'Enter your current password.'
  if (!next) errors.next = 'Enter a new password.'
  else if (next.length < 8) errors.next = 'New password must be at least 8 characters.'
  if (!confirm) errors.confirm = 'Confirm your new password.'
  else if (next && confirm !== next) errors.confirm = 'Passwords do not match.'
  return errors
}

export function SettingsPage() {
  const { session, api } = useAuth()
  const user = session!.user
  const { values, setValues, errors, setErrors, set } = useForm<Values>(BLANK)
  const [done, setDone] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setValues(BLANK)
    setErrors({})
    setFailure(null)
    setDone(false)
  }

  const submit = async () => {
    setDone(false)
    setFailure(null)
    const found = validate(values)
    setErrors(found)
    if (hasErrors(found)) return

    setBusy(true)
    try {
      await api.post(`/users/${user.id}/password`, { currentPassword: values.current, newPassword: values.next })
      setValues(BLANK)
      setDone(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) setErrors({ current: 'Current password is incorrect.' })
      else setFailure('Could not update your password. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="page-title">Account settings</h1>
      <div className="narrow">
        <section className="card" aria-labelledby="email-heading">
          <div className="card-head">
            <h2 id="email-heading">Email</h2>
          </div>
          <div className="card-body">
            <TextField
              label="Company email"
              type="email"
              value={user.email}
              onChange={() => undefined}
              disabled
              hint="This is your sign-in. It is set by your administrator and cannot be changed here."
            />
          </div>
        </section>
        <section className="card" aria-labelledby="password-heading">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <div className="card-head">
              <h2 id="password-heading">Change password</h2>
            </div>
            <div className="card-body">
              <TextField label="Current password" required type="password" autoComplete="current-password" value={values.current} onChange={set('current')} error={errors.current} />
              <TextField label="New password" required type="password" autoComplete="new-password" value={values.next} onChange={set('next')} error={errors.next} />
              <TextField label="Confirm new password" required type="password" autoComplete="new-password" value={values.confirm} onChange={set('confirm')} error={errors.confirm} />
              {done && (
                <div className="message message-status" role="status">
                  Password updated.
                </div>
              )}
              {failure && (
                <div className="message message-alert" role="alert">
                  {failure}
                </div>
              )}
            </div>
            <div className="card-foot">
              <button className="btn-secondary" type="button" onClick={reset}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={busy}>
                Update password
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  )
}
