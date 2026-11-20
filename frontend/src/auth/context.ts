import { createContext } from 'react'
import type { Api } from '../api/client.ts'
import type { Session } from './session.ts'

export type AuthValue = {
  session: Session | null
  /** True after the server rejected a session that was in use. */
  expired: boolean
  api: Api
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
