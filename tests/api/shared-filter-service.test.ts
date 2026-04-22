import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * A6 — SharedFilterService must NEVER throw. Returns [] on any failure.
 *
 * Depends on SharedHttp being defined in the same scope. Load both.
 */

function loadFilterService(opts: {
  httpGetImpl: (url: string, o?: any) => Promise<any>;
}): { SharedFilterService: any } {
  const win: any = {
    REPORT_API_BASE_URL: 'https://example.com',
    TokenUtils: { getToken: () => 'x', redirectToLogin: () => {} },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }),
    SharedHttp: {
      get: opts.httpGetImpl,
      buildQuery: () => '',
      getAuthHeader: () => 'Bearer x',
    },
  };
  const src = readFileSync(path.join(__dirname, '..', '..', 'shared-filter-service.js'), 'utf-8');
  const fn = new Function('window', src);
  fn(win);
  return { SharedFilterService: win.SharedFilterService };
}

test.describe('@p0 SharedFilterService', () => {
  test('A6 getCountries — returns array on success', async () => {
    const { SharedFilterService } = loadFilterService({
      httpGetImpl: async () => [{ id: 1, name_th: 'ไทย' }],
    });
    const result = await SharedFilterService.getCountries();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  test('A6 getCountries — returns [] on network error (never throws)', async () => {
    const { SharedFilterService } = loadFilterService({
      httpGetImpl: async () => { throw new Error('network down'); },
    });
    const result = await SharedFilterService.getCountries();
    expect(result).toEqual([]);
  });

  test('A6 getTeams — returns [] on error', async () => {
    const { SharedFilterService } = loadFilterService({
      httpGetImpl: async () => { throw new Error('fail'); },
    });
    const result = await SharedFilterService.getTeams();
    expect(result).toEqual([]);
  });

  test('A6 getJobPositions — returns [] on error', async () => {
    const { SharedFilterService } = loadFilterService({
      httpGetImpl: async () => { throw new Error('fail'); },
    });
    const result = await SharedFilterService.getJobPositions();
    expect(result).toEqual([]);
  });

  test('A6 getUsers — returns [] on error', async () => {
    const { SharedFilterService } = loadFilterService({
      httpGetImpl: async () => { throw new Error('fail'); },
    });
    const result = await SharedFilterService.getUsers();
    expect(result).toEqual([]);
  });
});
