import type { Api } from './client.ts'
import type { Body, Building } from './types.ts'

export const listBuildings = (api: Api) => api.fetchAll<Building>('/building-codes')
export const createBuilding = (api: Api, body: Body) => api.post<Building>('/building-codes', body)
export const updateBuilding = (api: Api, id: number, changes: Body) => api.patch<Building>(`/building-codes/${id}`, changes)
