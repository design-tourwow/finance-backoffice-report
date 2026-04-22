import { test, expect, seedToken } from '../support/test-base';
import { factory } from '../fixtures/mock-backend';

/**
 * E13 — Chart renders with mocked data; canvas element present on 3 pages.
 */

const CHART_PAGES = [
  { path: '/supplier-commission', reportKey: 'supplierReport' },
  { path: '/discount-sales', reportKey: 'discountSalesReport' },
  { path: '/request-discount', reportKey: 'orderHasDiscount' },
] as const;

test.describe('@p2 E13 Chart render', () => {
  for (const { path: route, reportKey } of CHART_PAGES) {
    test(`${route} renders Chart.js canvas with data`, async ({ page, mockedBackend, mockToken }) => {
      await seedToken(page, mockToken);
      await mockedBackend({
        countries: [factory.country()],
        [reportKey]: [factory.supplier(1), factory.supplier(2), factory.supplier(3)],
      } as any);
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible({ timeout: 10_000 });

      // Canvas should have non-zero dimensions
      const box = await canvas.boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      expect(box?.height).toBeGreaterThan(0);
    });
  }
});
