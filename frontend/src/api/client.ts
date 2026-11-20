/** A failed API call. Status 0 means the server could not be reached at all. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type Query = Record<string, string | number | undefined>

/** The envelope every backend list is wrapped in. */
export type Page<T> = { data: T[]; page: number; pageSize: number; total: number; totalPages: number }

export type Api = {
  get<T>(path: string, query?: Query): Promise<T>
  post<T>(path: string, body: unknown, query?: Query): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  delete(path: string): Promise<void>
  /** Every row of a paginated list: reads page 1, then the remaining pages, and joins them. */
  fetchAll<T>(path: string, query?: Query): Promise<T[]>
}

type Options = {
  getSessionId: () => string | null
  /** Called on any 401: the session is no longer valid. */
  onUnauthorized: () => void
  baseUrl?: string
}

/** The backend answers errors as `{ message }`, where message is text or a list of texts. */
async function messageOf(response: Response) {
  try {
    const { message } = await response.json()
    return Array.isArray(message) ? message.join(', ') : String(message ?? response.statusText)
  } catch {
    return response.statusText || `Request failed (${response.status})`
  }
}

export function createApi({ getSessionId, onUnauthorized, baseUrl = '/api' }: Options): Api {
  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const url = new URL(`${baseUrl}${path}`, window.location.origin)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    const headers: Record<string, string> = {}
    const sessionId = getSessionId()
    if (sessionId) headers['x-session-id'] = sessionId
    if (body !== undefined) headers['content-type'] = 'application/json'

    let response: Response
    try {
      response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    } catch {
      throw new ApiError(0, 'Could not reach the server')
    }
    if (response.status === 401) onUnauthorized()
    if (!response.ok) throw new ApiError(response.status, await messageOf(response))
    if (response.status === 204) return undefined as T
    return response.json()
  }

  const get = <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query)

  return {
    get,
    post: (path, body, query) => request('POST', path, body, query),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
    async fetchAll<T>(path: string, query?: Query) {
      const first = await get<Page<T>>(path, { ...query, page: 1 })
      const rest = await Promise.all(
        Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, i) => get<Page<T>>(path, { ...query, page: i + 2 })),
      )
      return [first, ...rest].flatMap((page) => page.data)
    },
  }
}
