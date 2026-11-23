import { useEffect, useId, useRef, useState } from 'react'
import { DEMO_DISABLED } from '../auth/demo.ts'
import { shortName, type User } from '../auth/session.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Icon } from '../components/Icon.tsx'

/** The signed-in user's button in the header; opens a menu with Sign out. */
export function AccountMenu({ user }: { user: User }) {
  const { session, signOut } = useAuth()
  const demo = session?.isDemoUser === true
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', close)
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('mousedown', close)
    }
  }, [open])

  return (
    <div className="account" ref={root}>
      <button
        className="account-btn"
        type="button"
        aria-label={`Account: ${shortName(user)}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="account" size={20} />
        <span>{shortName(user)}</span>
      </button>
      {open && (
        <div className="menu" id={menuId} role="menu">
          <button
            type="button"
            role="menuitem"
            // aria-disabled, not disabled: browsers often hide the tooltip of a natively disabled button.
            aria-disabled={demo || undefined}
            title={demo ? DEMO_DISABLED : undefined}
            onClick={() => {
              if (!demo) void signOut()
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
