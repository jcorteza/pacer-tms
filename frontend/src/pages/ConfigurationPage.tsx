import { CONFIGURATION_ROLES, hasAnyRole } from '../auth/roles.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Message } from '../components/Message.tsx'
import { BuildingsSection } from './configuration/BuildingsSection.tsx'
import { ItemsSection } from './configuration/ItemsSection.tsx'
import { SitesSection } from './configuration/SitesSection.tsx'
import { useConfigData } from './configuration/useConfigData.ts'

const SECTIONS = [
  { href: '#sites', label: 'Sites' },
  { href: '#buildings', label: 'Buildings' },
  { href: '#items', label: 'Item locations' },
]

/** Every manager opens this page, but only warehouse and operations management have anything on it. */
export function ConfigurationPage() {
  const { session } = useAuth()

  if (!hasAnyRole(session!.user, CONFIGURATION_ROLES)) {
    return (
      <>
        <h1 className="page-title">Configuration</h1>
        <Message>Nothing to see here.</Message>
      </>
    )
  }
  return <ConfigurationSections />
}

/** Its own component so the data is only requested for users who can see it. */
function ConfigurationSections() {
  const { data, failed, reload } = useConfigData()

  return (
    <>
      <div className="page-header">
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
        <Message tone="alert">Could not load the configuration. Refresh the page to try again.</Message>
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
