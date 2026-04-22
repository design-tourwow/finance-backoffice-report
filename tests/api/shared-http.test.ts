import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * API / HTTP test sample (U6, U7, A2). Loads shared-http.js into a fake-window
 * shim with stubbed fetch + TokenUtils and asserts behaviour.
 */

function loadSharedHttp(opts: {
  token?: string | null;
  fetchImpl?: any;
  onRedirect?: (msg?: string) => void;
} = {}): { SharedHttp: any; win: any } {
  const src = readFileSync(path.join(__dirname, '..', '..', 'shared-http.js'), 'utf-8');
  const win: any = {
    TokenUtils: {
      getToken: () => opts.token ?? null,
      redirectToLogin: (msg?: string) => opts.onRedirect?.(msg),
    },
    REPORT_API_BASE_URL: 'https://example.com',
    fetch: opts.fetchImpl ?? (async () => ({ ok: true, status: 200, json: async () => ({}) })),
  };
  // jsdom-free: provide globals fetch uses
  (global as any).fetch = win.fetch;
  const fn = new Function('window', src);
  fn(win);
  return { SharedHttp: win.SharedHttp, win };
}

test.describe('@p1 SharedHttp', () => {
  test('U6 buildQuery — skip undefined/null/empty + encode', () => {
    const { SharedHttp } = loadSharedHttp();
    expect(SharedHttp.buildQuery({})).toBe('');
    expect(SharedHttp.buildQuery({ year: 2026, country_id: 5 })).toBe('?year=2026&country_id=5');
    expect(SharedHttp.buildQuery({ year: 2026, empty: '', nil: null, undef: undefined })).toBe('?year=2026');
    expect(SharedHttp.buildQuery({ q: 'a b&c' })).toContain('a%20b%26c');
  });

  test('U7 getAuthHeader — with/without token', () => {
    const noToken = loadSharedHttp({ token: null });
    expect(noToken.SharedHttp.getAuthHeader()).toBeUndefined();
    const withToken = loadSharedHttp({ token: 'abc.def.ghi' });
    expect(withToken.SharedHttp.getAuthHeader()).toBe('Bearer abc.def.ghi');
  });

  test('@p0 A2 401 → redirectToLogin called once + throws AuthError (no hang)', async () => {
    let redirectCount = 0;
    const { SharedHttp } = loadSharedHttp({
      token: 'fake-jwt',
      onRedirect: () => redirectCount++,
      fetchImpl: async () => ({ ok: false, status: 401, statusText: 'Unauthorized', text: async () => '' }),
    });
    // Must throw (not hang) so parallel callers' try/catch can recover
    await expect(SharedHttp.get('/api/x')).rejects.toMatchObject({ status: 401 });
    expect(redirectCount).toBe(1);
  });

  test('@p0 A1 get sends Authorization: Bearer <token>', async () => {
    let capturedHeaders: Record<string, string> | null = null;
    const { SharedHttp } = loadSharedHttp({
      token: 'my-jwt',
      fetchImpl: async (_url: string, init: any) => {
        capturedHeaders = init?.headers || {};
        return { ok: true, status: 200, json: async () => ({ data: [] }) };
      },
    });
    await SharedHttp.get('/api/x');
    expect(capturedHeaders).not.toBeNull();
    const auth = (capturedHeaders as any).Authorization || (capturedHeaders as any).authorization;
    expect(auth).toBe('Bearer my-jwt');
  });

  test('@p0 A3 non-2xx throws readable Error with status + url', async () => {
    const { SharedHttp } = loadSharedHttp({
      token: 'x',
      fetchImpl: async () => ({ ok: false, status: 500, statusText: 'Server Error', text: async () => 'boom' }),
    });
    await expect(SharedHttp.get('/api/x')).rejects.toThrow(/500/);
  });

  test('@p1 A4 network error throws', async () => {
    const { SharedHttp } = loadSharedHttp({
      token: 'x',
      fetchImpl: async () => { throw new Error('ECONNREFUSED'); },
    });
    await expect(SharedHttp.get('/api/x')).rejects.toThrow();
  });
});
