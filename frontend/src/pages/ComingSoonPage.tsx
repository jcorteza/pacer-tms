/** Stands in for a section that is in the nav but not built yet. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="caption">Coming soon.</p>
    </>
  )
}
