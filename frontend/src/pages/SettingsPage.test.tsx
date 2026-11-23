import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { dana, demoSession } from '../test/fixtures.ts'
import { renderApp } from '../test/render.tsx'
import { server } from '../test/server.ts'

const current = () => screen.getByLabelText(/^current password/i)
const next = () => screen.getByLabelText(/^new password/i)
const confirm = () => screen.getByLabelText(/^confirm new password/i)
const update = () => screen.getByRole('button', { name: 'Update password' })

/** Records password-change calls and answers with `status`. */
function servePasswordChange(status = 204) {
  const calls: { id: string; body: unknown }[] = []
  server.use(http.post('*/api/users/:id/password', async ({ params, request }) => {
    calls.push({ id: params.id as string, body: await request.json() })
    return status === 204 ? new HttpResponse(null, { status }) : HttpResponse.json({ message: 'nope' }, { status })
  }))
  return calls
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, values: { current?: string; next?: string; confirm?: string }) {
  if (values.current) await user.type(current(), values.current)
  if (values.next) await user.type(next(), values.next)
  if (values.confirm) await user.type(confirm(), values.confirm)
}

describe('account settings page', () => {
  it('shows the sign-in email, disabled, with an explanation', () => {
    renderApp('/settings')

    const field = screen.getByLabelText('Company email')
    expect(field).toHaveValue(dana.email)
    expect(field).toBeDisabled()
    expect(screen.getByText(/set by your administrator and cannot be changed here/i)).toBeInTheDocument()
  })

  it('has three required, masked password fields', () => {
    renderApp('/settings')

    for (const field of [current(), next(), confirm()]) {
      expect(field).toHaveAttribute('type', 'password')
      expect(field).toBeRequired()
    }
  })

  it('given a valid change, updates the password for the signed-in user and confirms it', async () => {
    const calls = servePasswordChange()
    const user = userEvent.setup()
    renderApp('/settings')

    await fillForm(user, { current: 'old-password', next: 'new-password-1', confirm: 'new-password-1' })
    await user.click(update())

    expect(await screen.findByRole('status')).toHaveTextContent(/password updated/i)
    expect(calls).toEqual([{ id: dana.id, body: { currentPassword: 'old-password', newPassword: 'new-password-1' } }])
    expect(current()).toHaveValue('')
    expect(next()).toHaveValue('')
    expect(confirm()).toHaveValue('')
  })

  it('given a confirmation that differs, explains and sends nothing', async () => {
    const calls = servePasswordChange()
    const user = userEvent.setup()
    renderApp('/settings')

    await fillForm(user, { current: 'old-password', next: 'new-password-1', confirm: 'new-password-2' })
    await user.click(update())

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('given a new password under 8 characters, explains and sends nothing', async () => {
    const calls = servePasswordChange()
    const user = userEvent.setup()
    renderApp('/settings')

    await fillForm(user, { current: 'old-password', next: 'short', confirm: 'short' })
    await user.click(update())

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('given missing fields, asks for them and sends nothing', async () => {
    const calls = servePasswordChange()
    const user = userEvent.setup()
    renderApp('/settings')

    await user.click(update())

    expect(await screen.findByText(/enter your current password/i)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('given a wrong current password, says so next to that field and keeps what was typed', async () => {
    servePasswordChange(403)
    const user = userEvent.setup()
    renderApp('/settings')

    await fillForm(user, { current: 'guess', next: 'new-password-1', confirm: 'new-password-1' })
    await user.click(update())

    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument()
    expect(next()).toHaveValue('new-password-1')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('given an unexpected server error, shows a general failure message', async () => {
    servePasswordChange(500)
    const user = userEvent.setup()
    renderApp('/settings')

    await fillForm(user, { current: 'old-password', next: 'new-password-1', confirm: 'new-password-1' })
    await user.click(update())

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not update your password/i)
  })

  it('given a demo session, disables the password form and explains why', () => {
    const calls = servePasswordChange()
    renderApp('/settings', { session: demoSession })

    for (const field of [current(), next(), confirm()]) expect(field).toBeDisabled()
    expect(update()).toBeDisabled()
    expect(screen.getByText(/password changes are disabled in demo mode/i)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('clears the form on Cancel', async () => {
    const user = userEvent.setup()
    renderApp('/settings')

    await fillForm(user, { current: 'old-password', next: 'new-password-1', confirm: 'new-password-1' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(current()).toHaveValue('')
    expect(next()).toHaveValue('')
    expect(confirm()).toHaveValue('')
  })
})
