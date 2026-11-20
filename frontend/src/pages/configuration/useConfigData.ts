import { useCallback, useEffect, useState } from 'react'
import type { User } from '../../auth/session.ts'
import { useAuth } from '../../auth/useAuth.ts'
import type { Building, Client, ConfigData, Item, ItemLocation, Site } from './types.ts'

/** Loads every list the page needs. `reload` refreshes them after a save. */
export function useConfigData() {
  const { api } = useAuth()
  const [data, setData] = useState<ConfigData | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(
    () =>
      Promise.all([
        api.fetchAll<Site>('/warehouse-codes'),
        api.fetchAll<Building>('/building-codes'),
        api.fetchAll<Item>('/items'),
        api.fetchAll<ItemLocation>('/item-locations'),
        api.fetchAll<Client>('/clients'),
        api.fetchAll<User>('/users', { role: 'Warehouse Management' }),
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
