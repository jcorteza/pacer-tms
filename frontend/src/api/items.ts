import type { Api } from './client.ts'
import type { Body, Item } from './types.ts'

export const listItems = (api: Api) => api.fetchAll<Item>('/items')
export const createItem = (api: Api, body: Body) => api.post<Item>('/items', body)
export const updateItem = (api: Api, id: number, changes: Body) => api.patch<Item>(`/items/${id}`, changes)
