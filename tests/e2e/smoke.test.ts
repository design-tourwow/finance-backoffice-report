import { test, expect, seedToken } from '../support/test-base';

/**
 * E1 smoke — all 10 routes load without console errors. @p0 blocking.
 *
 * Uses mocked backend + pre-seeded token to avoid hitting prod or bouncing
 * to the login redirect.
 */

const ROUTES = [
  '/',
  '/dashboard',
  '/tour-image-manager',
  '/sales-by-country',
  '/wholesale-destinations',
  '/commission-report-plus',
  '/work-list',
  '/supplier-commission',
  '/discount-sales',
  '/order-external-summary',
  '/request-discount',
];

test.describe('@p0 @smoke E1 — all routes load', () => {
  for (const route of ROUTES) {
    test(`route ${route} loads without console errors`, async ({ page, mockedBackend, mockToken }) => {
      await mockedBackend();
      await seedToken(page, mockToken);

      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(400);

      // Menu must render on every page
      await expect(page.locator('.nav-menu .nav-item, .nav-menu .nav-item-toggle').first()).toBeVisible();

      // Zero console errors
      expect(consoleErrors, `console errors on ${route}`).toHaveLength(0);
    });
  }
});
