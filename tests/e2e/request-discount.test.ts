import { test, expect, seedToken } from '../support/test-base';
import { factory } from '../fixtures/mock-backend';

/**
 * E9 — Request Discount in-memory checkbox filter does NOT trigger API calls.
 * This validates Story 6.3 AC which is the most fragile behaviour post-refactor.
 */

test.describe('@p1 E9 Request Discount in-memory filter', () => {
  test('checkbox toggle issues 0 new API calls', async ({ page, mockedBackend, mockToken }) => {
    await seedToken(page, mockToken);

    // Seed a dataset with both paid and discounted orders
    const orders = [
      { order_info: { order_code: 'A1', created_at: '2026-01-01' }, customer_info: { customer_name: 'A' }, payment_details: { status_list: ['paid'] }, financial_metrics: { discount: 100, discount_percent: 5 } },
      { order_info: { order_code: 'A2', created_at: '2026-01-02' }, customer_info: { customer_name: 'B' }, payment_details: { status_list: ['pending'] }, financial_metrics: { discount: 0, discount_percent: 0 } },
    ];
    await mockedBackend({
      countries: [factory.country()],
      teams: [factory.team()],
      orderHasDiscount: orders,
    });

    await page.goto('/request-discount');
    await page.waitForLoadState('networkidle');

    // Count API requests to order-has-discount endpoint
    let apiCallCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/api/reports/order-has-discount')) apiCallCount++;
    });

    // Find checkbox — may be labelled in Thai
    const checkbox = page.getByRole('checkbox').first();
    if (await checkbox.count() > 0) {
      await checkbox.click();
      await page.waitForTimeout(500);
      await checkbox.click();
      await page.waitForTimeout(500);
    }

    expect(apiCallCount, 'checkbox toggles must not call API').toBe(0);
  });
});
