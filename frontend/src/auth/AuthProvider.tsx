import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { createApi } from '../api/client.ts'
import { AuthContext, type AuthValue } from './context.ts'
import { clearSession, loadSession, peekSession, saveSession, type Session } from './session.ts'

/** Holds the signed-in session and the API client that sends it. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [expired, setExpired] = useState(false)

  const end = useCallback(() => {
    clearSession()
    setSession(null)
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

  const value = useMemo<AuthValue>(
    () => ({
      session,
      expired,
      api,
      async signIn(email, password) {
        const next = await api.post<Session>('/sessions', { email, password })
        saveSession(next)
        setSession(next)
        setExpired(false)
      },
      async signOut() {
        const id = peekSession()?.id
        // Sign out locally even if the server cannot be reached.
        if (id) await api.delete(`/sessions/${id}`).catch(() => undefined)
        end()
      },
    }),
    [session, expired, api, end],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
