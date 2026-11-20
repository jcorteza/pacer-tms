import { setupServer } from 'msw/node'

/** The fake network every test runs against; tests add handlers with `server.use(...)`. */
export const server = setupServer()
