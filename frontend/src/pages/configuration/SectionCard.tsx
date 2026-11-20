import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon.tsx'

type Props = {
  /** Also the anchor the page's jump links point at. */
  id: string
  title: string
  caption: string
  addLabel: string
  onAdd: () => void
  children: ReactNode
}

/** A titled card with an Add button; the table goes inside. */
export function SectionCard({ id, title, caption, addLabel, onAdd, children }: Props) {
  const headingId = `${id}-heading`
  return (
    <section className="card" id={id} aria-labelledby={headingId}>
      <div className="card-head">
        <div>
          <h2 id={headingId}>{title}</h2>
          <div className="caption">{caption}</div>
        </div>
        <button className="btn" type="button" onClick={onAdd}>
          <Icon name="plus" size={18} />
          {addLabel}
        </button>
      </div>
      <div className="table-wrap">{children}</div>
    </section>
  )
}
