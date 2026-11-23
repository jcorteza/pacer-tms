import type { IconName } from './components/Icon.tsx'
import { MANAGEMENT_ROLES } from './auth/roles.ts'

export const COMPANY_NAME = 'Larkspur Freight'

type NavItem = {
  path: string
  label: string
  icon: IconName
  /** Only users holding one of these roles see the item. Left out, everyone does. */
  roles?: readonly string[]
}

/** The nav bar, in order. The first entry is also where the app opens, so it must be open to everyone. */
export const NAV_ITEMS: NavItem[] = [
  { path: '/shipments', label: 'Shipments', icon: 'shipments' },
  { path: '/configuration', label: 'Configuration', icon: 'configuration', roles: MANAGEMENT_ROLES },
  { path: '/settings', label: 'Account settings', icon: 'account' },
]
