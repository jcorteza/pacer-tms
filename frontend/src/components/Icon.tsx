import type { ReactNode } from 'react'

const PATHS: Record<string, ReactNode> = {
  brand: <><path d="M5 6l6 6-6 6" /><path d="M13 6l6 6-6 6" /></>,
  shipments: <><path d="M2 7h11v9H2z" /><path d="M13 10h4l4 3v3h-8" /><circle cx="6.5" cy="18.5" r="1.8" /><circle cx="17.5" cy="18.5" r="1.8" /></>,
  configuration: <><path d="M4 7h8" /><path d="M18 7h2" /><path d="M4 17h2" /><path d="M12 17h8" /><circle cx="15" cy="7" r="2.5" /><circle cx="9" cy="17" r="2.5" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  collapse: <><path d="M4 5h16v14H4z" /><path d="M9 5v14" /><path d="M16 10l-2 2 2 2" /></>,
  expand: <><path d="M4 5h16v14H4z" /><path d="M9 5v14" /><path d="M14 10l2 2-2 2" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  chevron: <path d="M6 9l6 6 6-6" />,
  close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  xcircle: <><circle cx="12" cy="12" r="9.6" /><path d="M8.8 8.8l6.4 6.4" /><path d="M15.2 8.8l-6.4 6.4" /></>,
  checkcircle: <><circle cx="12" cy="12" r="9.6" /><path d="M8 12.5l2.7 2.7L16 9.5" /></>,
  alert: <><path d="M12 3.5L2.5 20h19z" /><path d="M12 10v5" /><path d="M12 17.5v.5" /></>,
  info: <><circle cx="12" cy="12" r="9.6" /><path d="M12 11v5.5" /><path d="M12 7.8h.01" /></>,
}

export type IconName = keyof typeof PATHS

/** Decorative line icon; the control that holds it carries the accessible name. */
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={name === 'brand' || name === 'plus' || name === 'chevron' || name === 'close' ? 2.2 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      {PATHS[name]}
    </svg>
  )
}
