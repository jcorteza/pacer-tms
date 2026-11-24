import type { Api } from './client.ts'
import type { Body, Site } from './types.ts'

export const listSites = (api: Api) => api.fetchAll<Site>('/warehouse-codes')
export const createSite = (api: Api, body: Body) => api.post<Site>('/warehouse-codes', body)
export const updateSite = (api: Api, id: number, changes: Body) => api.patch<Site>(`/warehouse-codes/${id}`, changes)
