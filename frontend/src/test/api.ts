import { http, HttpResponse } from 'msw'
import { buildings, clients, itemLocations, items, managers, sites } from './fixtures.ts'
import { server } from './server.ts'

export type LoggedRequest = { method: string; path: string; body?: unknown; sessionId: string | null }

/** The page envelope the backend wraps every list in. */
export const pageOf = <T>(data: T[], page = 1, pageSize = 50, total = data.length) => ({
  data,
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
})

type Row = Record<string, unknown> & { id: number | string }

/**
 * A stand-in for the backend's resources, kept in memory so a POST or PATCH shows up
 * in the next GET. `log` records every call (with the session header it carried).
 */
export function serveConfiguration({ pageSize = 50 }: { pageSize?: number } = {}) {
  const tables: Record<string, Row[]> = {
    'warehouse-codes': structuredClone(sites),
    'building-codes': structuredClone(buildings),
    items: structuredClone(items),
    'item-locations': structuredClone(itemLocations),
    clients: structuredClone(clients),
  }
  const log: LoggedRequest[] = []
  const failures = new Map<string, number>()
  let nextId = 100

  /** Make the next `method` call to `resource` answer with `status`. */
  const failNext = (method: 'POST' | 'PATCH', resource: string, status = 500) => failures.set(`${method} ${resource}`, status)
  const failureFor = (method: string, resource: string) => {
    const status = failures.get(`${method} ${resource}`)
    failures.delete(`${method} ${resource}`)
    return status ? new HttpResponse(null, { status }) : undefined
  }
  const record = async (request: Request, hasBody: boolean) => {
    const path = new URL(request.url).pathname.replace(/^\/api/, '')
    const body = hasBody ? await request.json() : undefined
    log.push({ method: request.method, path, body, sessionId: request.headers.get('x-session-id') })
    return body as Record<string, unknown>
  }

  server.use(
    http.get('*/api/users', async ({ request }) => {
      await record(request, false)
      return HttpResponse.json(pageOf(managers))
    }),
    http.get('*/api/:resource', async ({ request, params }) => {
      await record(request, false)
      const rows = tables[params.resource as string]
      if (!rows) return new HttpResponse(null, { status: 404 })
      const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
      return HttpResponse.json(pageOf(rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, rows.length))
    }),
    http.post('*/api/:resource', async ({ request, params }) => {
      const resource = params.resource as string
      const body = await record(request, true)
      const failure = failureFor('POST', resource)
      if (failure) return failure
      const row = { id: nextId++, code: `N${nextId}`, ...body } as Row
      tables[resource].push(row)
      return HttpResponse.json(row, { status: 201 })
    }),
    http.patch('*/api/:resource/:id', async ({ request, params }) => {
      const resource = params.resource as string
      const body = await record(request, true)
      const failure = failureFor('PATCH', resource)
      if (failure) return failure
      const row = tables[resource].find((r) => String(r.id) === params.id)
      if (!row) return new HttpResponse(null, { status: 404 })
      Object.assign(row, body)
      return HttpResponse.json(row)
    }),
  )

  return { log, tables, failNext, calls: (method: string, path: string) => log.filter((r) => r.method === method && r.path === path) }
}
