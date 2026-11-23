import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { hasAnyRole } from './roles.ts'
import { useAuth } from './useAuth.ts'

/** Sends a signed-in user without one of `roles` to the app's first page. Goes inside RequireAuth. */
export function RequireRole({ roles, children }: { roles: readonly string[]; children: ReactNode }) {
  const { session } = useAuth()
  if (!session || !hasAnyRole(session.user, roles)) return <Navigate to="/" replace />
  return children
}
