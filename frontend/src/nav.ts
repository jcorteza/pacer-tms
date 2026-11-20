import type { IconName } from './components/Icon.tsx'

export const COMPANY_NAME = 'Larkspur Freight'

/** The nav bar, in order. The first entry is also where the app opens. */
export const NAV_ITEMS: { path: string; label: string; icon: IconName }[] = [
  { path: '/shipments', label: 'Shipments', icon: 'shipments' },
  { path: '/configuration', label: 'Configuration', icon: 'configuration' },
  { path: '/settings', label: 'Account settings', icon: 'account' },
]
