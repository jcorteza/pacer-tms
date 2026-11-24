import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createApi } from '../api/client.ts'
import { signIn, signOut, startDemoSession } from '../api/sessions.ts'
import { AuthContext, type AuthValue } from './context.ts'
import { isDemoMode } from './demo.ts'
import { clearSession, loadSession, peekSession, saveSession, type Session } from './session.ts'

/** Holds the signed-in session and the API client that sends it. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [expired, setExpired] = useState(false)
  // Set when the backend refused the automatic demo sign-in; the normal login form takes over.
  const [demoFailed, setDemoFailed] = useState(false)
  // StrictMode runs effects twice in development; this keeps that to one demo sign-in request.
  const demoRequested = useRef(false)

  const end = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const begin = useCallback((next: Session) => {
    saveSession(next)
    setSession(next)
    setExpired(false)
  }, [])

  // Browser storage is the source of truth for the session id, so the client always sends the current one.
  const api = useMemo(
    () =>
      createApi({
        getSessionId: () => peekSession()?.id ?? null,
        onUnauthorized: () => {
          // A 401 while signed in means the session ended; a 401 at login just means wrong credentials.
          if (!peekSession()) return
          end()
          setExpired(true)
        },
      }),
    [end],
  )

  // In demo mode there is no login: whenever there is no session (first visit or expiry), start a demo one.
  const signingInAsDemo = isDemoMode() && !session && !demoFailed
  useEffect(() => {
    if (!signingInAsDemo || demoRequested.current) return
    demoRequested.current = true
    startDemoSession(api)
      .then(begin)
      .catch(() => setDemoFailed(true))
      .finally(() => {
        demoRequested.current = false
      })
  }, [signingInAsDemo, api, begin])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      expired,
      signingInAsDemo,
      api,
      async signIn(email, password) {
        begin(await signIn(api, email, password))
      },
      async signOut() {
        const id = peekSession()?.id
        // Sign out locally even if the server cannot be reached.
        if (id) await signOut(api, id).catch(() => undefined)
        end()
      },
    }),
    [session, expired, signingInAsDemo, api, begin, end],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
