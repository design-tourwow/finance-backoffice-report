import { test, expect, seedToken } from '../support/test-base';

/**
 * E10 — Dashboard cards navigate to correct URLs.
 */

test.describe('@p2 E10 Dashboard', () => {
  test('cards link to correct report pages', async ({ page, mockedBackend, mockToken }) => {
    await seedToken(page, mockToken);
    await mockedBackend();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const targets = ['/supplier-commission', '/discount-sales', '/request-discount', '/order-external-summary'];
    for (const href of targets) {
      const link = page.locator(`a[href="${href}"]`).first();
      await expect(link).toBeVisible();
    }
  });

  test('welcome hero visible', async ({ page, mockedBackend, mockToken }) => {
    await seedToken(page, mockToken);
    await mockedBackend();
    await page.goto('/dashboard');
    await expect(page.getByText(/ยินดีต้อนรับ|Welcome/)).toBeVisible();
  });
});
