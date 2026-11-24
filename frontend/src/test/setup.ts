import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { server } from './server.ts'

// Any request a test did not expect to make fails loudly instead of reaching the network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
// The developer's .env may turn demo mode on; specs run with it off unless they stub it on.
beforeEach(() => vi.stubEnv('VITE_DEMO_MODE', 'false'))
afterEach(() => {
  vi.unstubAllEnvs()
  cleanup()
  server.resetHandlers()
  sessionStorage.clear()
  localStorage.clear()
})
afterAll(() => server.close())
