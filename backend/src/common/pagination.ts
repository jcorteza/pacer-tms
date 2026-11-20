export type PageRequest = { page: number; pageSize: number };

export type Page<T> = PageRequest & { data: T[]; total: number; totalPages: number };

/** The LIMIT/OFFSET that selects a 1-based page. */
export function pageWindow(page: number, pageSize: number) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

/** Wraps one page of rows with the metadata a client needs to page further. */
export function buildPage<T>(data: T[], { total, page, pageSize }: PageRequest & { total: number }): Page<T> {
  return { data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
