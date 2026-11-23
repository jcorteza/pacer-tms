/** The roles that manage people and may open the Configuration page. */
export const MANAGEMENT_ROLES = ['Operations Management', 'Warehouse Management', 'Accounting Management'] as const

/** The roles that see the Configuration sections (sites, buildings, item locations). */
export const CONFIGURATION_ROLES = ['Operations Management', 'Warehouse Management'] as const

export const hasAnyRole = (user: { roles: string[] }, allowed: readonly string[]) =>
  user.roles.some((role) => allowed.includes(role))
