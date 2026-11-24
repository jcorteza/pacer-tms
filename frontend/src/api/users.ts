import type { User } from '../auth/session.ts'
import type { Api } from './client.ts'

export const listWarehouseManagers = (api: Api) => api.fetchAll<User>('/users', { role: 'Warehouse Management' })

export const changePassword = (api: Api, userId: string, passwords: { currentPassword: string; newPassword: string }) =>
  api.post<void>(`/users/${userId}/password`, passwords)
