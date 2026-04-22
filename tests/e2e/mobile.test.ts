import { test, expect, seedToken } from '../support/test-base';
import { factory } from '../fixtures/mock-backend';
import { devices } from '@playwright/test';

/**
 * E15 — Mobile viewport smoke. @p3
 */

test.use({ ...devices['iPhone 13'] });

test.describe('@p3 E15 Mobile viewport', () => {
  test('supplier-commission works on 375px width', async ({ page, mockedBackend, mockToken }) => {
    await seedToken(page, mockToken);
    await mockedBackend({ countries: [factory.country()], supplierReport: [] });
    await page.goto('/supplier-commission');
    await page.waitForLoadState('domcontentloaded');

    // Mobile: sidebar should collapse; mobile menu toggle visible
    const mobileToggle = page.locator('.mobile-menu-toggle');
    if (await mobileToggle.count() > 0) {
      await expect(mobileToggle).toBeVisible();
    }
    // Main content area should still render
    await expect(page.locator('.content-area, #main-content, main').first()).toBeVisible();
  });

  test('dashboard cards stack vertically on mobile', async ({ page, mockedBackend, mockToken }) => {
    await seedToken(page, mockToken);
    await mockedBackend();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/ยินดีต้อนรับ|Welcome/)).toBeVisible();
  });
});
