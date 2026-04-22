/**
 * Mock JWT generator. Client-side code only decodes base64 — no signature
 * verification — so any JWT-shaped string with valid base64 payload works.
 */
function base64UrlEncode(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function makeMockJwt(overrides: { exp?: number; sub?: string; iat?: number } = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlEncode({
    sub: overrides.sub ?? 'test-user',
    iat: overrides.iat ?? now,
    exp: overrides.exp ?? now + 24 * 3600,
  });
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

export function makeExpiredJwt(): string {
  return makeMockJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
}
