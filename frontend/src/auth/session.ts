export type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  roles: string[]
}

export type Session = {
  id: string
  userId?: string
  expiresAt: string
  user: User
}

const KEY = 'pacer.session'

export function saveSession(session: Session) {
  sessionStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(KEY)
}

/** The stored session as-is, without checking its expiry; what the API client sends. */
export function peekSession(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Session | null
  } catch {
    return null
  }
}

/** The remembered session, or null if there is none, it is unreadable, or it has expired. */
export function loadSession(): Session | null {
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as Session
    if (new Date(session.expiresAt).getTime() > Date.now()) return session
  } catch {
    // fall through: an unreadable entry is treated as no session
  }
  clearSession()
  return null
}

/** "Dana W." for the header. */
export const shortName = ({ firstName, lastName }: User) => `${firstName} ${lastName.charAt(0)}.`
