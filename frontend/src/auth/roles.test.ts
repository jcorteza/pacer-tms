import { describe, expect, it } from 'vitest'
import { CONFIGURATION_ROLES, hasAnyRole, MANAGEMENT_ROLES } from './roles.ts'

describe('role groups', () => {
  it('management is operations, warehouse and accounting management', () => {
    expect([...MANAGEMENT_ROLES].sort()).toEqual(['Accounting Management', 'Operations Management', 'Warehouse Management'])
  })

  it('the configuration sections are for operations and warehouse management only', () => {
    expect([...CONFIGURATION_ROLES].sort()).toEqual(['Operations Management', 'Warehouse Management'])
  })
})

describe('hasAnyRole', () => {
  it('given a user holding one of the roles, is true', () => {
    expect(hasAnyRole({ roles: ['Dispatcher', 'Warehouse Management'] }, MANAGEMENT_ROLES)).toBe(true)
  })

  it('given a user holding none of the roles, is false', () => {
    expect(hasAnyRole({ roles: ['Dispatcher', 'Warehouse'] }, MANAGEMENT_ROLES)).toBe(false)
  })

  it('given a user with no roles, is false', () => {
    expect(hasAnyRole({ roles: [] }, MANAGEMENT_ROLES)).toBe(false)
  })
})
