import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { loadSession, type Session } from '../auth/session.ts'
import { serveConfiguration } from '../test/api.ts'
import {
  accountingManagerSession,
  demoSession,
  operationsManagerSession,
  session,
  warehouseManagerSession,
} from '../test/fixtures.ts'
import { renderApp } from '../test/render.tsx'
import { server } from '../test/server.ts'

const primaryNav = () => screen.getByRole('navigation', { name: 'Primary' })
const navToggle = () => within(primaryNav()).getByRole('button', { name: /(expand|collapse) navigation/i })
/** The links in order, by accessible name: a collapsed rail shows icons only, so its names are not visible text. */
const expectLinks = (names: string[]) => {
  const links = within(primaryNav()).getAllByRole('link')
  expect(links).toHaveLength(names.length)
  names.forEach((name, index) => expect(links[index]).toHaveAccessibleName(name))
}

describe('app shell', () => {
  it('shows the product, the customer and who is signed in', () => {
    renderApp('/')

    const header = screen.getByRole('banner')
    expect(within(header).getByText('Pacer TMS')).toBeInTheDocument()
    expect(within(header).getByText('Larkspur Freight')).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'Account: Dana W.' })).toBeInTheDocument()
  })

  it('lists the sections in order, with no Home page', () => {
    renderApp('/', { session: operationsManagerSession })

    expectLinks(['Shipments', 'Configuration', 'Account settings'])
  })

  it.each([
    ['Operations Management', operationsManagerSession],
    ['Warehouse Management', warehouseManagerSession],
    ['Accounting Management', accountingManagerSession],
  ])('given %s, offers Configuration', (_role: string, managerSession: Session) => {
    renderApp('/', { session: managerSession })

    expect(screen.getByRole('link', { name: 'Configuration' })).toBeInTheDocument()
  })

  it('given no management role, leaves Configuration out of the nav', () => {
    renderApp('/')

    expectLinks(['Shipments', 'Account settings'])
  })

  it('opens the first section in the nav at the root address, and marks it current', () => {
    renderApp('/', { session: operationsManagerSession })

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(screen.getByRole('heading', { level: 1, name: 'Shipments' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Shipments' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Configuration' })).not.toHaveAttribute('aria-current')
  })

  it('moves between pages from the nav', async () => {
    serveConfiguration()
    const user = userEvent.setup()
    renderApp('/', { session: warehouseManagerSession })

    await user.click(screen.getByRole('link', { name: 'Configuration' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuration' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Configuration' })).toHaveAttribute('aria-current', 'page')
  })

  describe('navigation rail', () => {
    it('starts collapsed: icon-only links that are still named and titled by their page', () => {
      renderApp('/')

      expect(navToggle()).toHaveAccessibleName('Expand navigation')
      expect(navToggle()).toHaveAttribute('aria-expanded', 'false')
      expectLinks(['Shipments', 'Account settings'])
      expect(screen.getByRole('link', { name: 'Shipments' })).toHaveAttribute('title', 'Shipments')
      expect(within(primaryNav()).queryByText('Shipments')).not.toBeInTheDocument()
    })

    it('expands to show each page name when the toggle is clicked', async () => {
      const user = userEvent.setup()
      renderApp('/')

      await user.click(navToggle())

      expect(navToggle()).toHaveAccessibleName('Collapse navigation')
      expect(navToggle()).toHaveAttribute('aria-expanded', 'true')
      expect(navToggle()).toHaveTextContent('Collapse')
      expect(within(primaryNav()).getByText('Shipments')).toBeInTheDocument()
      expect(within(primaryNav()).getByText('Account settings')).toBeInTheDocument()
    })

    it('collapses again when the toggle is clicked a second time', async () => {
      const user = userEvent.setup()
      renderApp('/')

      await user.click(navToggle())
      await user.click(navToggle())

      expect(navToggle()).toHaveAccessibleName('Expand navigation')
      expect(within(primaryNav()).queryByText('Shipments')).not.toBeInTheDocument()
    })

    it.each([
      ['collapsed', false],
      ['expanded', true],
    ])('when %s, still marks the current page and moves between pages', async (_state: string, expand: boolean) => {
      const user = userEvent.setup()
      renderApp('/')
      if (expand) await user.click(navToggle())
      expect(screen.getByRole('link', { name: 'Shipments' })).toHaveAttribute('aria-current', 'page')

      await user.click(screen.getByRole('link', { name: 'Account settings' }))

      expect(await screen.findByRole('heading', { level: 1, name: 'Account settings' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Account settings' })).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('link', { name: 'Shipments' })).not.toHaveAttribute('aria-current')
    })

    it('remembers whether it was left expanded or collapsed when the app is opened again', async () => {
      const user = userEvent.setup()
      const first = renderApp('/')
      await user.click(navToggle())
      first.unmount()

      const second = renderApp('/')
      expect(navToggle()).toHaveAttribute('aria-expanded', 'true')

      await user.click(navToggle())
      second.unmount()

      renderApp('/')
      expect(navToggle()).toHaveAttribute('aria-expanded', 'false')
    })
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

  it('given a demo session, shows Sign out disabled with a tooltip and does nothing when clicked', async () => {
    let deletes = 0
    server.use(http.delete('*/api/sessions/:id', () => {
      deletes++
      return new HttpResponse(null, { status: 204 })
    }))
    const user = userEvent.setup()
    renderApp('/', { session: demoSession })

    await user.click(screen.getByRole('button', { name: 'Account: Demo U.' }))
    const signOut = screen.getByRole('menuitem', { name: 'Sign out' })
    expect(signOut).toHaveAttribute('aria-disabled', 'true')
    expect(signOut).toHaveAttribute('title', 'Disabled in demo mode')
    await user.click(signOut)

    expect(deletes).toBe(0)
    expect(screen.getByRole('button', { name: 'Account: Demo U.' })).toBeInTheDocument()
    expect(loadSession()).not.toBeNull()
  })

  it('given a regular session, leaves Sign out enabled', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByRole('button', { name: 'Account: Dana W.' }))

    const signOut = screen.getByRole('menuitem', { name: 'Sign out' })
    expect(signOut).not.toHaveAttribute('aria-disabled', 'true')
    expect(signOut).not.toHaveAttribute('title')
  })

  it('sends the session id with each request the pages make', async () => {
    const api = serveConfiguration()
    renderApp('/configuration', { session: warehouseManagerSession })

    await screen.findByRole('heading', { level: 1, name: 'Configuration' })
    await within(await screen.findByRole('region', { name: 'Sites' })).findByText('Central DC')

    expect(api.log.length).toBeGreaterThan(0)
    expect(api.log.every((r) => r.sessionId === session.id)).toBe(true)
  })

  it('given the server rejects the session, signs out and says the session expired', async () => {
    server.use(http.get('*/api/*', () => new HttpResponse(null, { status: 401 })))
    renderApp('/configuration', { session: warehouseManagerSession })

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
