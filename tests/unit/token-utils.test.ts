import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

function loadTokenUtils(storage: Record<string, string> = {}): any {
  const src = readFileSync(path.join(__dirname, '..', '..', 'token-utils.js'), 'utf-8');
  // Token-utils uses BARE `sessionStorage` / `localStorage` / `atob` —
  // they resolve to globals. Stub them on `globalThis` for this test.
  const g: any = globalThis;
  g.sessionStorage = {
    getItem: (k: string) => storage[`s:${k}`] ?? null,
    setItem: (k: string, v: string) => { storage[`s:${k}`] = v; },
    removeItem: (k: string) => { delete storage[`s:${k}`]; },
  };
  g.localStorage = {
    getItem: (k: string) => storage[`l:${k}`] ?? null,
    setItem: (k: string, v: string) => { storage[`l:${k}`] = v; },
    removeItem: (k: string) => { delete storage[`l:${k}`]; },
  };
  if (typeof g.atob !== 'function') {
    g.atob = (s: string) => Buffer.from(s, 'base64').toString('utf-8');
  }
  if (typeof g.window === 'undefined') g.window = { location: { hostname: 'localhost', href: '' } };
  const fn = new Function('module', 'exports', `${src}; return TokenUtils;`);
  return fn({ exports: {} }, {});
}

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`;
}

test.describe('@p0 TokenUtils', () => {
  test('U9 decodeToken — valid token returns payload', () => {
    const T = loadTokenUtils();
    const token = makeJwt({ sub: 'u1', exp: 9999999999 });
    const decoded = T.decodeToken(token);
    expect(decoded).toMatchObject({ sub: 'u1', exp: 9999999999 });
  });

  test('U9 decodeToken — malformed token returns null', () => {
    const T = loadTokenUtils();
    expect(T.decodeToken('not.a.jwt')).toBeNull();
    expect(T.decodeToken('notevenformatted')).toBeNull();
    expect(T.decodeToken(null)).toBeNull();
    expect(T.decodeToken('')).toBeNull();
  });

  test('U9 isTokenExpired — expired token returns true', () => {
    const T = loadTokenUtils();
    const expired = makeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
    expect(T.isTokenExpired(expired)).toBe(true);
  });

  test('U9 isTokenExpired — fresh token returns false', () => {
    const T = loadTokenUtils();
    const fresh = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(T.isTokenExpired(fresh)).toBe(false);
  });

  test('U9 isTokenExpired — no token in storage returns true (treated as expired)', () => {
    // Empty storage → getToken() returns null → isTokenExpired returns true
    const T = loadTokenUtils({});
    expect(T.isTokenExpired()).toBe(true);
  });
});
