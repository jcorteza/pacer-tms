import { buildPage, pageWindow } from './pagination.js';

describe('pageWindow', () => {
  it('given page 1, starts at offset 0', () => {
    expect(pageWindow(1, 50)).toEqual({ limit: 50, offset: 0 });
  });

  it('given a later page, skips the rows of every earlier page', () => {
    expect(pageWindow(3, 20)).toEqual({ limit: 20, offset: 40 });
  });
});

describe('buildPage', () => {
  it('wraps the rows with paging metadata', () => {
    const page = buildPage(['a', 'b'], { total: 5, page: 2, pageSize: 2 });

    expect(page).toEqual({ data: ['a', 'b'], page: 2, pageSize: 2, total: 5, totalPages: 3 });
  });

  it('given no rows at all, reports zero pages', () => {
    const page = buildPage([], { total: 0, page: 1, pageSize: 50 });

    expect(page.totalPages).toBe(0);
  });
});
