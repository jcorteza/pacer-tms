import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoSession } from '../test/fixtures.ts'
import { renderApp } from '../test/render.tsx'
import { server } from '../test/server.ts'
import { loadSession } from './session.ts'

const signInButton = () => screen.queryByRole('button', { name: 'Sign in' })

/** Answers session requests with the demo session (or `status`), recording each request body. */
function serveSessions(status = 201) {
  const bodies: string[] = []
  server.use(
    http.post('*/api/sessions', async ({ request }) => {
      bodies.push(await request.text())
      return status === 201 ? HttpResponse.json(demoSession, { status }) : HttpResponse.json({ message: 'nope' }, { status })
    }),
  )
  return bodies
}

describe('demo mode sign-in', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
  })

  it('given no session, signs in as the demo user without ever showing the login page', async () => {
    const bodies = serveSessions()
    renderApp('/settings', { session: null })

    expect(signInButton()).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Account settings' })).toBeInTheDocument()
    expect(signInButton()).not.toBeInTheDocument()
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).not.toMatch(/email|password/i)
    expect(screen.getByRole('button', { name: 'Account: Demo U.' })).toBeInTheDocument()
    expect(loadSession()).toMatchObject({ id: demoSession.id, isDemoUser: true })
  })

  it('given a live session, keeps it and does not sign in again', async () => {
    const bodies = serveSessions()
    renderApp('/settings', { session: demoSession })

    expect(await screen.findByRole('heading', { level: 1, name: 'Account settings' })).toBeInTheDocument()
    expect(bodies).toHaveLength(0)
  })

  it('given an expired session, signs in again', async () => {
    const bodies = serveSessions()
    renderApp('/settings', { session: { ...demoSession, expiresAt: '2020-01-01T00:00:00.000Z' } })

    expect(await screen.findByRole('heading', { level: 1, name: 'Account settings' })).toBeInTheDocument()
    expect(bodies).toHaveLength(1)
  })

  it('given a backend that is not in demo mode, falls back to the login form and does not retry', async () => {
    const bodies = serveSessions(400)
    renderApp('/settings', { session: null })

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(bodies).toHaveLength(1)
  })
})

describe('outside demo mode', () => {
  it('given no session, shows the login form and does not sign in on its own', () => {
    const bodies = serveSessions()
    renderApp('/settings', { session: null })

    expect(signInButton()).toBeInTheDocument()
    expect(bodies).toHaveLength(0)
  })
})
