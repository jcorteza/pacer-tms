import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDemoMode } from './demo.ts'

afterEach(() => vi.unstubAllEnvs())

describe('isDemoMode', () => {
  it('given VITE_DEMO_MODE=true, is on', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    expect(isDemoMode()).toBe(true)
  })

  it.each(['false', '', '1', 'yes', 'TRUE'])('given VITE_DEMO_MODE=%j, is off', (value) => {
    vi.stubEnv('VITE_DEMO_MODE', value)
    expect(isDemoMode()).toBe(false)
  })
})
