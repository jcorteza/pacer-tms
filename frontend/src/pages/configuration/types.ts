import type { User } from '../../auth/session.ts'

export type Site = {
  id: number
  code: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  managerId: string
}

export type Building = {
  id: number
  code: string
  warehouseId: number
  name: string
  type: 'storage' | 'transport'
}

export type Client = { id: string; name: string }

export type Item = {
  id: number
  clientId: string
  sku: string
  name: string
  weightLbs: string
  lengthIn: string
  widthIn: string
  heightIn: string
  cost: string
}

export type ItemLocation = {
  id: number
  code: string
  buildingId: number
  itemId: number | null
  description: string | null
}

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
