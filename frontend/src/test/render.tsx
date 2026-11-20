import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from '../App.tsx'
import { AuthProvider } from '../auth/AuthProvider.tsx'
import { saveSession, type Session } from '../auth/session.ts'
import { session as signedInSession } from './fixtures.ts'

/** Renders the whole app at `route`; pass `session: null` to start signed out. */
export function renderApp(route = '/', { session = signedInSession }: { session?: Session | null } = {}) {
  if (session) saveSession(session)
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}
