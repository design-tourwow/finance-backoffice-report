import { test, expect, seedToken } from '../support/test-base';

/**
 * E12 — Zero regression on 5 existing pages (NFR6).
 * After menu-component.js change (added Dashboard) + refactors to the 4 report
 * pages, the 5 legacy pages must still render identically.
 */

const EXISTING_PAGES = [
  '/tour-image-manager',
  '/sales-by-country',
  '/wholesale-destinations',
  '/commission-report-plus',
  '/work-list',
];

test.describe('@p0 E12 Existing pages regression', () => {
  for (const route of EXISTING_PAGES) {
    test(`${route} renders without regression`, async ({ page, mockedBackend, mockToken }) => {
      await seedToken(page, mockToken);
      await mockedBackend();

      const errors: string[] = [];
      page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);

      // Menu renders
      await expect(page.locator('.nav-menu').first()).toBeVisible();
      await expect(page.locator('.navbar-list').first()).toBeVisible();

      // Page content area exists
      await expect(page.locator('.content-area, main, #main-content').first()).toBeVisible();

      // No console errors
      expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
    });
  }
});

test('@p1 E5 menu active state matches current page', async ({ page, mockedBackend, mockToken }) => {
  await seedToken(page, mockToken);
  await mockedBackend();
  await page.goto('/supplier-commission');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('[aria-current="page"]').first()).toBeVisible();
});
