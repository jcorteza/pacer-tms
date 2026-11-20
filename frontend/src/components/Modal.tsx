import { useEffect, useId, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Icon } from './Icon.tsx'

type Props = {
  title: string
  submitLabel: string
  onSubmit: () => void
  onClose: () => void
  busy?: boolean
  /** Disables the submit button, e.g. once a partial save means submitting again would duplicate work. */
  submitDisabled?: boolean
  /** A failure from the server, shown above the buttons. */
  error?: string | null
  children: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'

/**
 * A dialog form. Focus moves to its first field on open, Tab stays inside it, Escape closes it,
 * and focus goes back to whatever opened it.
 */
export function Modal({ title, submitLabel, onSubmit, onClose, busy, submitDisabled, error, children }: Props) {
  const titleId = useId()
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    dialog.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
    return () => opener?.focus()
  }, [])

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') return onClose()
    if (event.key !== 'Tab') return
    const items = [...(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    const [first, last] = [items[0], items[items.length - 1]]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className="scrim">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialog} onKeyDown={handleKeyDown}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" type="button" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <form noValidate onSubmit={handleSubmit}>
          <div className="card-body">
            {children}
            {error && (
              <div className="message message-alert" role="alert">
                {error}
              </div>
            )}
          </div>
          <div className="card-foot">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" type="submit" disabled={busy || submitDisabled}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
