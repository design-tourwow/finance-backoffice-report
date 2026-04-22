import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * API / HTTP test sample (U6, U7, A2). Loads fe2-http.js into a fake-window
 * shim with stubbed fetch + TokenUtils and asserts behaviour.
 */

function loadFE2Http(opts: {
  token?: string | null;
  fetchImpl?: any;
  onRedirect?: (msg?: string) => void;
} = {}): { FE2Http: any; win: any } {
  const src = readFileSync(path.join(__dirname, '..', '..', 'fe2-http.js'), 'utf-8');
  const win: any = {
    TokenUtils: {
      getToken: () => opts.token ?? null,
      redirectToLogin: (msg?: string) => opts.onRedirect?.(msg),
    },
    FE2_API_BASE_URL: 'https://example.com',
    fetch: opts.fetchImpl ?? (async () => ({ ok: true, status: 200, json: async () => ({}) })),
  };
  // jsdom-free: provide globals fetch uses
  (global as any).fetch = win.fetch;
  const fn = new Function('window', src);
  fn(win);
  return { FE2Http: win.FE2Http, win };
}

test.describe('@p1 FE2Http', () => {
  test('U6 buildQuery — skip undefined/null/empty + encode', () => {
    const { FE2Http } = loadFE2Http();
    expect(FE2Http.buildQuery({})).toBe('');
    expect(FE2Http.buildQuery({ year: 2026, country_id: 5 })).toBe('?year=2026&country_id=5');
    expect(FE2Http.buildQuery({ year: 2026, empty: '', nil: null, undef: undefined })).toBe('?year=2026');
    expect(FE2Http.buildQuery({ q: 'a b&c' })).toContain('a%20b%26c');
  });

  test('U7 getAuthHeader — with/without token', () => {
    const noToken = loadFE2Http({ token: null });
    expect(noToken.FE2Http.getAuthHeader()).toBeUndefined();
    const withToken = loadFE2Http({ token: 'abc.def.ghi' });
    expect(withToken.FE2Http.getAuthHeader()).toBe('Bearer abc.def.ghi');
  });

  test('@p0 A2 401 → redirectToLogin called once, never resolves (no loop)', async () => {
    let redirectCount = 0;
    const { FE2Http } = loadFE2Http({
      token: 'fake-jwt',
      onRedirect: () => redirectCount++,
      fetchImpl: async () => ({ ok: false, status: 401, statusText: 'Unauthorized', text: async () => '' }),
    });
    let resolved = false;
    FE2Http.get('/api/x').then(() => { resolved = true; });
    await new Promise((r) => setTimeout(r, 50));
    expect(redirectCount).toBe(1);
    expect(resolved).toBe(false);
  });

  test('@p0 A1 get sends Authorization: Bearer <token>', async () => {
    let capturedHeaders: Record<string, string> | null = null;
    const { FE2Http } = loadFE2Http({
      token: 'my-jwt',
      fetchImpl: async (_url: string, init: any) => {
        capturedHeaders = init?.headers || {};
        return { ok: true, status: 200, json: async () => ({ data: [] }) };
      },
    });
    await FE2Http.get('/api/x');
    expect(capturedHeaders).not.toBeNull();
    const auth = (capturedHeaders as any).Authorization || (capturedHeaders as any).authorization;
    expect(auth).toBe('Bearer my-jwt');
  });

  test('@p0 A3 non-2xx throws readable Error with status + url', async () => {
    const { FE2Http } = loadFE2Http({
      token: 'x',
      fetchImpl: async () => ({ ok: false, status: 500, statusText: 'Server Error', text: async () => 'boom' }),
    });
    await expect(FE2Http.get('/api/x')).rejects.toThrow(/500/);
  });

  test('@p1 A4 network error throws', async () => {
    const { FE2Http } = loadFE2Http({
      token: 'x',
      fetchImpl: async () => { throw new Error('ECONNREFUSED'); },
    });
    await expect(FE2Http.get('/api/x')).rejects.toThrow();
  });
});
