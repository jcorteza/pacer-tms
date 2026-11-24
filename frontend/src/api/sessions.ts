import type { Session } from '../auth/session.ts'
import type { Api } from './client.ts'

export const signIn = (api: Api, email: string, password: string) => api.post<Session>('/sessions', { email, password })

/** Demo mode: the backend starts a session for a throwaway user when no credentials are sent. */
export const startDemoSession = (api: Api) => api.post<Session>('/sessions', undefined)

export const signOut = (api: Api, sessionId: string) => api.delete(`/sessions/${sessionId}`)
