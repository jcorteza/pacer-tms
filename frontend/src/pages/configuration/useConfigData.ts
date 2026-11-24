import { useCallback, useEffect, useState } from 'react'
import { listBuildings } from '../../api/building-codes.ts'
import { listClients } from '../../api/clients.ts'
import { listItemLocations } from '../../api/item-locations.ts'
import { listItems } from '../../api/items.ts'
import { listWarehouseManagers } from '../../api/users.ts'
import { listSites } from '../../api/warehouse-codes.ts'
import { useAuth } from '../../auth/useAuth.ts'
import type { ConfigData } from './types.ts'

/** Loads every list the page needs. `reload` refreshes them after a save. */
export function useConfigData() {
  const { api } = useAuth()
  const [data, setData] = useState<ConfigData | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(
    () =>
      Promise.all([
        listSites(api),
        listBuildings(api),
        listItems(api),
        listItemLocations(api),
        listClients(api),
        listWarehouseManagers(api),
      ]).then(([sites, buildings, items, locations, clients, managers]): ConfigData => ({
        sites,
        buildings,
        items,
        locations,
        clients,
        managers,
      })),
    [api],
  )

  useEffect(() => {
    let current = true
    load().then(
      (next) => {
        if (!current) return
        setData(next)
        setFailed(false)
      },
      () => {
        if (current) setFailed(true)
      },
    )
    return () => {
      current = false
    }
  }, [load])

  const reload = useCallback(async () => {
    try {
      setData(await load())
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [load])

  return { data, failed, reload }
}
