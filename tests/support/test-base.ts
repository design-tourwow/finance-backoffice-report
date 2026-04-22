import { test as base, expect } from '@playwright/test';
import { makeMockJwt } from '../fixtures/mock-token';
import { mockBackend, type MockBackendOptions } from '../fixtures/mock-backend';

export interface Fixtures {
  authenticatedPage: typeof base.extend extends infer _ ? Parameters<Parameters<typeof base.extend>[0]['authenticatedPage']>[0]['page'] : never;
  mockedBackend: (opts?: MockBackendOptions) => Promise<void>;
  mockToken: string;
}

/**
 * Extended Playwright test with project-specific fixtures:
 *   test('my test', async ({ page, mockedBackend, mockToken }) => { ... });
 *
 * - `mockToken`: JWT-shaped string valid for 24h.
 * - `mockedBackend`: helper to stub all backend endpoints with data.
 * - pages with ?token=... auto-populate storage before navigation.
 */
export const test = base.extend<{
  mockToken: string;
  mockedBackend: (opts?: MockBackendOptions) => Promise<void>;
}>({
  mockToken: async ({}, use) => {
    await use(process.env.TEST_JWT || makeMockJwt());
  },
  mockedBackend: async ({ page }, use) => {
    const helper = async (opts: MockBackendOptions = {}) => {
      await mockBackend(page, opts);
    };
    await use(helper);
  },
});

/**
 * Helper: navigate to page with token query param (simulates Finance Backoffice handoff).
 * Token is stripped from URL by shared-auth-guard.js.
 */
export async function navigateWithToken(page: import('@playwright/test').Page, path: string, token: string): Promise<void> {
  const url = path.includes('?') ? `${path}&token=${encodeURIComponent(token)}` : `${path}?token=${encodeURIComponent(token)}`;
  await page.goto(url);
}

/**
 * Helper: pre-seed storage with token BEFORE navigation (avoids auth-guard redirect).
 */
export async function seedToken(page: import('@playwright/test').Page, token: string): Promise<void> {
  await page.addInitScript((t) => {
    window.sessionStorage.setItem('authToken', t);
    window.localStorage.setItem('authToken', t);
  }, token);
}

export { expect };
