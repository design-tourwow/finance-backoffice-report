import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * A6 — FE2FilterService must NEVER throw. Returns [] on any failure.
 *
 * Depends on FE2Http being defined in the same scope. Load both.
 */

function loadFilterService(opts: {
  httpGetImpl: (url: string, o?: any) => Promise<any>;
}): { FE2FilterService: any } {
  const win: any = {
    FE2_API_BASE_URL: 'https://example.com',
    TokenUtils: { getToken: () => 'x', redirectToLogin: () => {} },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }),
    FE2Http: {
      get: opts.httpGetImpl,
      buildQuery: () => '',
      getAuthHeader: () => 'Bearer x',
    },
  };
  const src = readFileSync(path.join(__dirname, '..', '..', 'fe2-filter-service.js'), 'utf-8');
  const fn = new Function('window', src);
  fn(win);
  return { FE2FilterService: win.FE2FilterService };
}

test.describe('@p0 FE2FilterService', () => {
  test('A6 getCountries — returns array on success', async () => {
    const { FE2FilterService } = loadFilterService({
      httpGetImpl: async () => [{ id: 1, name_th: 'ไทย' }],
    });
    const result = await FE2FilterService.getCountries();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  test('A6 getCountries — returns [] on network error (never throws)', async () => {
    const { FE2FilterService } = loadFilterService({
      httpGetImpl: async () => { throw new Error('network down'); },
    });
    const result = await FE2FilterService.getCountries();
    expect(result).toEqual([]);
  });

  test('A6 getTeams — returns [] on error', async () => {
    const { FE2FilterService } = loadFilterService({
      httpGetImpl: async () => { throw new Error('fail'); },
    });
    const result = await FE2FilterService.getTeams();
    expect(result).toEqual([]);
  });

  test('A6 getJobPositions — returns [] on error', async () => {
    const { FE2FilterService } = loadFilterService({
      httpGetImpl: async () => { throw new Error('fail'); },
    });
    const result = await FE2FilterService.getJobPositions();
    expect(result).toEqual([]);
  });

  test('A6 getUsers — returns [] on error', async () => {
    const { FE2FilterService } = loadFilterService({
      httpGetImpl: async () => { throw new Error('fail'); },
    });
    const result = await FE2FilterService.getUsers();
    expect(result).toEqual([]);
  });
});
