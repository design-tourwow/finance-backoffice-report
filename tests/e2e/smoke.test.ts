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

// E16 invariant — every report page's inline bootstrap must populate
// window.REPORT_API_BASE_URL. If a shell regresses (e.g. someone deletes
// the `REPORT_API_BASE_URL = API_BASE_URL` line), SharedHttp falls back to
// relative URLs and every API call 404s silently on Vercel.
const REPORT_PAGES = [
  '/dashboard',
  '/supplier-commission',
  '/discount-sales',
  '/order-external-summary',
  '/request-discount',
];

test.describe('@p0 E16 REPORT_API_BASE_URL invariant', () => {
  for (const route of REPORT_PAGES) {
    test(`${route} sets window.REPORT_API_BASE_URL to a FBR host`, async ({ page, mockedBackend, mockToken }) => {
      await mockedBackend();
      await seedToken(page, mockToken);
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      const bases = await page.evaluate(() => ({
        report: (window as any).REPORT_API_BASE_URL,
        api: (window as any).API_BASE_URL,
      }));
      expect(bases.report, `REPORT_API_BASE_URL on ${route}`).toMatch(/finance-backoffice-report-api\.vercel\.app$/);
      expect(bases.report, 'REPORT_API_BASE_URL mirrors API_BASE_URL').toBe(bases.api);
    });
  }
});
