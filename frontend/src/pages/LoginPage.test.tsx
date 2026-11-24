import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { loadSession } from '../auth/session.ts'
import { dana, session } from '../test/fixtures.ts'
import { renderApp } from '../test/render.tsx'
import { server } from '../test/server.ts'

const email = () => screen.getByLabelText(/company email/i)
const password = () => screen.getByLabelText(/^password/i)
const signInButton = () => screen.getByRole('button', { name: 'Sign in' })

describe('login page', () => {
  it('features the company name and explains that accounts come from an administrator', () => {
    renderApp('/login', { session: null })

    expect(screen.getByRole('heading', { level: 1, name: 'Larkspur Freight' })).toBeInTheDocument()
    expect(screen.getByText(/accounts are created by your administrator/i)).toBeInTheDocument()
  })

  it('has labelled email and password fields, and no sign-up link', () => {
    renderApp('/login', { session: null })

    expect(email()).toHaveAttribute('type', 'email')
    expect(password()).toHaveAttribute('type', 'password')
    expect(screen.queryByRole('link', { name: /sign up|create account|register/i })).not.toBeInTheDocument()
  })

  it('sends a signed-out visitor from any page to login', () => {
    renderApp('/settings', { session: null })

    expect(screen.getByRole('heading', { level: 1, name: 'Larkspur Freight' })).toBeInTheDocument()
  })

  it('given good credentials, signs in, remembers the session and opens the first page in the nav', async () => {
    let sent: unknown
    server.use(http.post('*/api/sessions', async ({ request }) => {
      sent = await request.json()
      return HttpResponse.json(session, { status: 201 })
    }))
    const user = userEvent.setup()
    renderApp('/login', { session: null })

    await user.type(email(), dana.email)
    await user.type(password(), 'a-good-password')
    await user.click(signInButton())

    expect(await screen.findByRole('heading', { level: 1, name: 'Shipments' })).toBeInTheDocument()
    expect(sent).toEqual({ email: dana.email, password: 'a-good-password' })
    expect(loadSession()).toMatchObject({ id: session.id, user: { firstName: 'Dana' } })
    expect(screen.getByRole('button', { name: 'Account: Dana W.' })).toBeInTheDocument()
  })

  it('given the page they were sent from, returns them there after signing in', async () => {
    server.use(http.post('*/api/sessions', () => HttpResponse.json(session, { status: 201 })))
    server.use(http.get('*/api/*', () => HttpResponse.json({ data: [], page: 1, pageSize: 50, total: 0, totalPages: 0 })))
    const user = userEvent.setup()
    renderApp('/settings', { session: null })

    await user.type(email(), dana.email)
    await user.type(password(), 'a-good-password')
    await user.click(signInButton())

    expect(await screen.findByRole('heading', { level: 1, name: 'Account settings' })).toBeInTheDocument()
  })

  it('given wrong credentials, says so, stays on the page and keeps nothing', async () => {
    server.use(http.post('*/api/sessions', () => HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })))
    const user = userEvent.setup()
    renderApp('/login', { session: null })

    await user.type(email(), dana.email)
    await user.type(password(), 'wrong')
    await user.click(signInButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i)
    expect(screen.getByRole('heading', { level: 1, name: 'Larkspur Freight' })).toBeInTheDocument()
    expect(loadSession()).toBeNull()
  })

  it('given too many attempts, says how long to wait instead of a generic error', async () => {
    server.use(http.post('*/api/sessions', () => HttpResponse.json({ message: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': '300' } })))
    const user = userEvent.setup()
    renderApp('/login', { session: null })

    await user.type(email(), dana.email)
    await user.type(password(), 'a-good-password')
    await user.click(signInButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Try again in 5 minutes.')
    expect(loadSession()).toBeNull()
  })

  it('given empty fields, asks for them without calling the server', async () => {
    let requests = 0
    server.use(http.post('*/api/sessions', () => {
      requests++
      return HttpResponse.json(session, { status: 201 })
    }))
    const user = userEvent.setup()
    renderApp('/login', { session: null })

    await user.click(signInButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter your company email and password/i)
    expect(requests).toBe(0)
  })

  it('given the server is unreachable, shows a retryable error', async () => {
    server.use(http.post('*/api/sessions', () => HttpResponse.error()))
    const user = userEvent.setup()
    renderApp('/login', { session: null })

    await user.type(email(), dana.email)
    await user.type(password(), 'a-good-password')
    await user.click(signInButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i)
    await waitFor(() => expect(signInButton()).toBeEnabled())
  })

  it('sends an already signed-in user straight to the first page in the nav', () => {
    renderApp('/login')

    expect(screen.getByRole('heading', { level: 1, name: 'Shipments' })).toBeInTheDocument()
  })
})
