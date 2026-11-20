import { BuildingsSection } from './configuration/BuildingsSection.tsx'
import { ItemsSection } from './configuration/ItemsSection.tsx'
import { SitesSection } from './configuration/SitesSection.tsx'
import { useConfigData } from './configuration/useConfigData.ts'

const SECTIONS = [
  { href: '#sites', label: 'Sites' },
  { href: '#buildings', label: 'Buildings' },
  { href: '#items', label: 'Item locations' },
]

export function ConfigurationPage() {
  const { data, failed, reload } = useConfigData()

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="page-title">Configuration</h1>
        <div className="anchors">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} className="anchor" href={href}>
              {label}
            </a>
          ))}
        </div>
      </div>
      {failed && !data && (
        <div className="message message-alert" role="alert">
          Could not load the configuration. Refresh the page to try again.
        </div>
      )}
      {data && (
        <>
          <SitesSection data={data} reload={reload} />
          <BuildingsSection data={data} reload={reload} />
          <ItemsSection data={data} reload={reload} />
        </>
      )}
    </>
  )
}
