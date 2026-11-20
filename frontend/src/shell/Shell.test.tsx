import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { loadSession } from '../auth/session.ts'
import { serveConfiguration } from '../test/api.ts'
import { session } from '../test/fixtures.ts'
import { renderApp } from '../test/render.tsx'
import { server } from '../test/server.ts'

describe('app shell', () => {
  it('shows the product, the customer and who is signed in', () => {
    renderApp('/')

    const header = screen.getByRole('banner')
    expect(within(header).getByText('Pacer TMS')).toBeInTheDocument()
    expect(within(header).getByText('Larkspur Freight')).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'Account: Dana W.' })).toBeInTheDocument()
  })

  it('lists the sections in order, with no Home page', () => {
    renderApp('/')

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Shipments',
      'Configuration',
      'Account settings',
    ])
  })

  it('opens the first section in the nav at the root address, and marks it current', () => {
    renderApp('/')

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(screen.getByRole('heading', { level: 1, name: 'Shipments' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Shipments' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Configuration' })).not.toHaveAttribute('aria-current')
  })

  it('moves between pages from the nav', async () => {
    serveConfiguration()
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByRole('link', { name: 'Configuration' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuration' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Configuration' })).toHaveAttribute('aria-current', 'page')
  })

  it('has a placeholder page for what is not built yet', () => {
    renderApp('/shipments')

    expect(screen.getByRole('heading', { level: 1, name: 'Shipments' })).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('signs out: ends the session on the server, forgets it, and returns to login', async () => {
    let deleted: string | undefined
    server.use(http.delete('*/api/sessions/:id', ({ params }) => {
      deleted = params.id as string
      return new HttpResponse(null, { status: 204 })
    }))
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByRole('button', { name: 'Account: Dana W.' }))
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Larkspur Freight' })).toBeInTheDocument()
    expect(deleted).toBe(session.id)
    expect(loadSession()).toBeNull()
  })

  it('still signs out locally when the server cannot be reached', async () => {
    server.use(http.delete('*/api/sessions/:id', () => HttpResponse.error()))
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByRole('button', { name: 'Account: Dana W.' }))
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Larkspur Freight' })).toBeInTheDocument()
    expect(loadSession()).toBeNull()
  })

  it('sends the session id with each request the pages make', async () => {
    const api = serveConfiguration()
    renderApp('/configuration')

    await screen.findByRole('heading', { level: 1, name: 'Configuration' })
    await within(await screen.findByRole('region', { name: 'Sites' })).findByText('Central DC')

    expect(api.log.length).toBeGreaterThan(0)
    expect(api.log.every((r) => r.sessionId === session.id)).toBe(true)
  })

  it('given the server rejects the session, signs out and says the session expired', async () => {
    server.use(http.get('*/api/*', () => new HttpResponse(null, { status: 401 })))
    renderApp('/configuration')

    expect(await screen.findByRole('heading', { level: 1, name: 'Larkspur Freight' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/your session expired/i)
    expect(loadSession()).toBeNull()
  })

  it('given a session past its expiry time, goes to login without asking the server', () => {
    renderApp('/', { session: { ...session, expiresAt: '2020-01-01T00:00:00.000Z' } })

    expect(screen.getByRole('heading', { level: 1, name: 'Larkspur Freight' })).toBeInTheDocument()
    expect(loadSession()).toBeNull()
  })
})
