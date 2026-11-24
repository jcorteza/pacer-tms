import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { pageOf } from '../test/api.ts'
import { server } from '../test/server.ts'
import { createApi, type Api } from './client.ts'
import { createBuilding, listBuildings, updateBuilding } from './building-codes.ts'
import { listClients } from './clients.ts'
import { createItemLocation, listItemLocations, updateItemLocation } from './item-locations.ts'
import { createItem, listItems, updateItem } from './items.ts'
import { signIn, signOut, startDemoSession } from './sessions.ts'
import { changePassword, listWarehouseManagers } from './users.ts'
import { createSite, listSites, updateSite } from './warehouse-codes.ts'

const api = createApi({ getSessionId: () => null, onUnauthorized: () => undefined })

type Seen = { method: string; path: string; query: Record<string, string>; body?: unknown }

/** Answers every /api call with `reply` and records what was sent. */
function serve(reply: () => Response = () => HttpResponse.json(pageOf([]))) {
  const seen: Seen[] = []
  server.use(
    http.all('*/api/*', async ({ request }) => {
      const url = new URL(request.url)
      const hasBody = request.headers.get('content-type')?.includes('json')
      seen.push({
        method: request.method,
        path: url.pathname.replace(/^\/api/, ''),
        query: Object.fromEntries(url.searchParams),
        body: hasBody ? await request.json() : undefined,
      })
      return reply()
    }),
  )
  return seen
}

describe('listing', () => {
  it.each([
    ['listSites', listSites, '/warehouse-codes'],
    ['listBuildings', listBuildings, '/building-codes'],
    ['listItems', listItems, '/items'],
    ['listItemLocations', listItemLocations, '/item-locations'],
    ['listClients', listClients, '/clients'],
  ])('%s reads every row of %s', async (_name: string, list: (api: Api) => Promise<unknown[]>, path: string) => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const seen = serve(() => HttpResponse.json(pageOf(rows)))

    const result = await list(api)

    expect(result).toEqual(rows)
    expect(seen.map((r) => [r.method, r.path])).toEqual([['GET', path]])
  })

  it('listWarehouseManagers asks only for users with the Warehouse Management role', async () => {
    const seen = serve(() => HttpResponse.json(pageOf([{ id: 'u1' }])))

    const result = await listWarehouseManagers(api)

    expect(result).toEqual([{ id: 'u1' }])
    expect(seen[0]).toMatchObject({ method: 'GET', path: '/users', query: { role: 'Warehouse Management' } })
  })
})

describe('creating and updating', () => {
  it.each([
    ['site', createSite, updateSite, '/warehouse-codes'],
    ['building', createBuilding, updateBuilding, '/building-codes'],
    ['item', createItem, updateItem, '/items'],
    ['item location', createItemLocation, updateItemLocation, '/item-locations'],
  ] as const)('a %s is created with POST and changed with PATCH by id', async (
    _name: string,
    create: (api: Api, body: never) => Promise<unknown>,
    update: (api: Api, id: number, body: never) => Promise<unknown>,
    path: string,
  ) => {
    const seen = serve(() => HttpResponse.json({ id: 7 }, { status: 201 }))

    const created = await create(api, { name: 'New' } as never)
    await update(api, 7, { name: 'Renamed' } as never)

    expect(created).toMatchObject({ id: 7 })
    expect(seen).toEqual([
      { method: 'POST', path, query: {}, body: { name: 'New' } },
      { method: 'PATCH', path: `${path}/7`, query: {}, body: { name: 'Renamed' } },
    ])
  })

  it('an item location can be unassigned from its item', async () => {
    const seen = serve(() => HttpResponse.json({ id: 4 }))

    await updateItemLocation(api, 4, { itemId: null })

    expect(seen[0].body).toEqual({ itemId: null })
  })
})

describe('users', () => {
  it('changePassword posts the current and new password to that user', async () => {
    const seen = serve(() => new HttpResponse(null, { status: 204 }))

    await changePassword(api, 'u1', { currentPassword: 'old', newPassword: 'new' })

    expect(seen).toEqual([
      { method: 'POST', path: '/users/u1/password', query: {}, body: { currentPassword: 'old', newPassword: 'new' } },
    ])
  })
})

describe('sessions', () => {
  it('signIn posts the credentials and returns the new session', async () => {
    const session = { id: 's1', isDemoUser: false }
    const seen = serve(() => HttpResponse.json(session, { status: 201 }))

    const result = await signIn(api, 'a@b.test', 'secret')

    expect(result).toEqual(session)
    expect(seen).toEqual([{ method: 'POST', path: '/sessions', query: {}, body: { email: 'a@b.test', password: 'secret' } }])
  })

  it('startDemoSession posts with no credentials', async () => {
    const seen = serve(() => HttpResponse.json({ id: 'demo', isDemoUser: true }, { status: 201 }))

    const result = await startDemoSession(api)

    expect(result).toMatchObject({ id: 'demo' })
    expect(seen).toEqual([{ method: 'POST', path: '/sessions', query: {}, body: undefined }])
  })

  it('signOut deletes that session', async () => {
    const seen = serve(() => new HttpResponse(null, { status: 204 }))

    await signOut(api, 's1')

    expect(seen).toEqual([{ method: 'DELETE', path: '/sessions/s1', query: {}, body: undefined }])
  })
})
