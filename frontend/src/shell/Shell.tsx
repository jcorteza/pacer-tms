import { Outlet } from 'react-router'
import { hasAnyRole } from '../auth/roles.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Icon } from '../components/Icon.tsx'
import { COMPANY_NAME, NAV_ITEMS } from '../nav.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { NavRail } from './NavRail.tsx'

/** The signed-in frame: header on top, nav rail on the left, the current page in the middle. */
export function Shell() {
  const { session } = useAuth()

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <Icon name="brand" size={28} color="var(--brand)" />
          <span className="wordmark">Pacer TMS</span>
        </div>
        <div className="divider" />
        <div className="customer">{COMPANY_NAME}</div>
        <div className="spacer" />
        {session && <AccountMenu user={session.user} />}
      </header>
      <div className="body">
        <NavRail items={NAV_ITEMS.filter(({ roles }) => !roles || (session && hasAnyRole(session.user, roles)))} />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
