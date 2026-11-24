import type { Building, Client, Item, ItemLocation, Site } from '../../api/types.ts'
import type { User } from '../../auth/session.ts'

/** Everything the Configuration page shows, loaded together. */
export type ConfigData = {
  sites: Site[]
  buildings: Building[]
  items: Item[]
  locations: ItemLocation[]
  clients: Client[]
  managers: User[]
}

/** What each section needs: the data, and a way to refresh it after a save. */
export type SectionProps = { data: ConfigData; reload: () => Promise<void> }
