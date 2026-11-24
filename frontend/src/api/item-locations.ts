import type { Api } from './client.ts'
import type { Body, ItemLocation } from './types.ts'

export const listItemLocations = (api: Api) => api.fetchAll<ItemLocation>('/item-locations')
export const createItemLocation = (api: Api, body: Body) => api.post<ItemLocation>('/item-locations', body)
export const updateItemLocation = (api: Api, id: number, changes: Body) => api.patch<ItemLocation>(`/item-locations/${id}`, changes)
