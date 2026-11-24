import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../test/server.ts'
import { pageOf } from '../test/api.ts'
import { ApiError, createApi, tooManyAttemptsMessage } from './client.ts'

const setup = (sessionId: string | null = 'sess-1') => {
  const onUnauthorized = vi.fn()
  return { onUnauthorized, api: createApi({ getSessionId: () => sessionId, onUnauthorized }) }
}

describe('api client', () => {
  it('sends the session id with every request', async () => {
    let header: string | null = null
    server.use(http.get('*/api/clients', ({ request }) => {
      header = request.headers.get('x-session-id')
      return HttpResponse.json(pageOf([]))
    }))

    await setup('sess-1').api.get('/clients')

    expect(header).toBe('sess-1')
  })

  it('sends no session header when signed out', async () => {
    let header: string | null = 'unset'
    server.use(http.post('*/api/sessions', ({ request }) => {
      header = request.headers.get('x-session-id')
      return HttpResponse.json({}, { status: 201 })
    }))

    await setup(null).api.post('/sessions', { email: 'a@b.test', password: 'x' })

    expect(header).toBeNull()
  })

  it('sends JSON bodies and query parameters', async () => {
    let seen: { body: unknown; role: string | null } | undefined
    server.use(http.post('*/api/users', async ({ request }) => {
      seen = { body: await request.json(), role: new URL(request.url).searchParams.get('role') }
      return HttpResponse.json({}, { status: 201 })
    }))

    await setup().api.post('/users', { firstName: 'Ada' }, { role: 'Dispatcher' })

    expect(seen).toEqual({ body: { firstName: 'Ada' }, role: 'Dispatcher' })
  })

  it('throws an ApiError carrying the status and the server message', async () => {
    server.use(http.post('*/api/sessions', () => HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })))
    const { api, onUnauthorized } = setup(null)

    await expect(api.post('/sessions', {})).rejects.toMatchObject({ status: 401, message: 'Invalid email or password' })
    await expect(api.post('/sessions', {})).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalled()
  })

  it('reads how long to wait from a 429, in seconds', async () => {
    server.use(http.post('*/api/sessions', () => HttpResponse.json({ message: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': '300' } })))

    await expect(setup(null).api.post('/sessions', {})).rejects.toMatchObject({ status: 429, retryAfterSeconds: 300 })
  })

  it('given no Retry-After header, leaves the wait unknown', async () => {
    server.use(http.get('*/api/orders', () => new HttpResponse(null, { status: 429 })))

    await expect(setup().api.get('/orders')).rejects.toMatchObject({ status: 429, retryAfterSeconds: undefined })
  })

  it('treats a 401 as an expired session', async () => {
    server.use(http.get('*/api/orders', () => new HttpResponse(null, { status: 401 })))
    const { api, onUnauthorized } = setup()

    await expect(api.get('/orders')).rejects.toMatchObject({ status: 401 })

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not treat other errors as an expired session', async () => {
    server.use(http.get('*/api/orders', () => new HttpResponse(null, { status: 500 })))
    const { api, onUnauthorized } = setup()

    await expect(api.get('/orders')).rejects.toMatchObject({ status: 500 })

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('returns nothing for a 204', async () => {
    server.use(http.delete('*/api/sessions/s1', () => new HttpResponse(null, { status: 204 })))

    await expect(setup().api.delete('/sessions/s1')).resolves.toBeUndefined()
  })

  describe('tooManyAttemptsMessage', () => {
    it.each([
      [300, 'Too many attempts. Try again in 5 minutes.'],
      [61, 'Too many attempts. Try again in 2 minutes.'],
      [30, 'Too many attempts. Try again in 1 minute.'],
      [undefined, 'Too many attempts. Wait a few minutes, then try again.'],
    ])('given a 429 to wait %s seconds, says "%s"', (seconds: number | undefined, message: string) => {
      expect(tooManyAttemptsMessage(new ApiError(429, 'Too Many Requests', seconds))).toBe(message)
    })

    it('given any other failure, has no message', () => {
      expect(tooManyAttemptsMessage(new ApiError(401, 'nope'))).toBeNull()
      expect(tooManyAttemptsMessage(new Error('boom'))).toBeNull()
    })
  })

  describe('fetchAll', () => {
    it('reads every page of a list and joins the rows', async () => {
      const pages: number[] = []
      server.use(http.get('*/api/items', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'))
        pages.push(page)
        return HttpResponse.json({ data: [{ id: page * 10 }, { id: page * 10 + 1 }], page, pageSize: 2, total: 5, totalPages: 3 })
      }))

      const rows = await setup().api.fetchAll<{ id: number }>('/items')

      expect(pages.sort()).toEqual([1, 2, 3])
      expect(rows.map((r) => r.id)).toEqual([10, 11, 20, 21, 30, 31])
    })

    it('given a single page, makes a single request', async () => {
      let requests = 0
      server.use(http.get('*/api/items', () => {
        requests++
        return HttpResponse.json(pageOf([{ id: 1 }]))
      }))

      expect(await setup().api.fetchAll('/items')).toEqual([{ id: 1 }])
      expect(requests).toBe(1)
    })

    it('keeps the query parameters on every page', async () => {
      const roles: (string | null)[] = []
      server.use(http.get('*/api/users', ({ request }) => {
        const url = new URL(request.url)
        roles.push(url.searchParams.get('role'))
        const page = Number(url.searchParams.get('page'))
        return HttpResponse.json({ data: [], page, pageSize: 1, total: 2, totalPages: 2 })
      }))

      await setup().api.fetchAll('/users', { role: 'Warehouse Management' })

      expect(roles).toEqual(['Warehouse Management', 'Warehouse Management'])
    })
  })
})
