import type { Api } from './client.ts'
import type { Client } from './types.ts'

export const listClients = (api: Api) => api.fetchAll<Client>('/clients')
