import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ApiError } from '../api/client.ts'
import { useAuth } from '../auth/useAuth.ts'
import { TextField } from '../components/fields.tsx'
import { Icon } from '../components/Icon.tsx'
import { COMPANY_NAME } from '../nav.ts'

const EXPIRED = 'Your session expired. Sign in again.'

function failureMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return 'Email or password is incorrect.'
  if (error instanceof ApiError && error.status === 0) return 'Could not reach the server. Try again.'
  return 'Something went wrong. Try again.'
}

export function LoginPage() {
  const { session, expired, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Signing in, or already being signed in, goes to the page that was asked for, else the app's first page.
  if (session) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your company email and password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (failure) {
      setError(failureMessage(failure))
      setBusy(false)
    }
  }

  const message = error ?? (expired ? EXPIRED : null)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <Icon name="brand" size={28} color="var(--brand)" />
          <span className="wordmark">Pacer TMS</span>
        </div>
      </header>
      <main className="login-main">
        <div className="login-stack">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
            <h1 className="login-title">{COMPANY_NAME}</h1>
            <p className="login-sub">Sign in with your company email and password.</p>
          </div>
          <form className="login-card" noValidate onSubmit={submit}>
            <TextField label="Company email" required type="email" autoComplete="username" value={email} onChange={setEmail} />
            <TextField label="Password" required type="password" autoComplete="current-password" value={password} onChange={setPassword} />
            {message && (
              <div className="message message-alert" role="alert">
                {message}
              </div>
            )}
            <button className="btn btn-block" type="submit" disabled={busy}>
              Sign in
            </button>
          </form>
          <div className="message login-note">
            <Icon name="info" size={18} />
            <span>Accounts are created by your administrator. If you cannot sign in, contact them.</span>
          </div>
        </div>
      </main>
    </div>
  )
}
