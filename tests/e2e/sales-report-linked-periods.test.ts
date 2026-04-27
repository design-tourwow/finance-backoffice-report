import { test, expect, seedToken } from '../support/test-base';
import { factory } from '../fixtures/mock-backend';

test.describe('@p1 Sales Report linked periods', () => {
  test('/sales-report keeps created/paid period filters in sync and still returns results', async ({ page, mockedBackend, mockToken }) => {
    const orders = [
      factory.commissionPlusOrder(1, {
        order_code: 'TWP25090001',
        created_at: '2025-09-03T10:00:00Z',
        first_paid_at: '2025-09-05T10:00:00Z',
      }),
      factory.commissionPlusOrder(2, {
        order_code: 'TWP25090002',
        created_at: '2025-09-12T10:00:00Z',
        first_paid_at: '2025-09-14T10:00:00Z',
      }),
    ];

    await seedToken(page, mockToken);
    await mockedBackend({
      availablePeriods: factory.availablePeriods(),
      commissionPlusSellers: {
        success: true,
        data: [factory.commissionPlusSeller(1), factory.commissionPlusSeller(2)],
      },
      commissionPlusReport: {
        success: true,
        data: {
          orders,
          summary: {
            total_net_amount: orders.reduce((sum, row) => sum + Number(row.net_amount || 0), 0),
            total_orders: orders.length,
            total_commission: orders.reduce((sum, row) => sum + Number(row.supplier_commission || 0), 0),
            total_discount: orders.reduce((sum, row) => sum + Number(row.discount || 0), 0),
          },
        },
      },
    });

    await page.goto('/sales-report');
    await page.waitForLoadState('networkidle');

    await page.locator('#crp-created-mode-host .filter-sort-btn').click();
    await page.locator('#crp-created-mode-host .filter-sort-option', { hasText: 'รายปี' }).click();

    await expect(page.locator('#crp-created-mode-host .filter-sort-btn-text')).toHaveText('รายปี');
    await expect(page.locator('#crp-paid-mode-host .filter-sort-btn-text')).toHaveText('รายปี');

    await page.locator('#crp-created-value-host .filter-sort-btn').click();
    await page.locator('#crp-created-value-host .filter-sort-option', { hasText: '2568 (2025)' }).click();

    await expect(page.locator('#crp-created-value-host .filter-sort-btn-text')).toHaveText('2568 (2025)');
    await expect(page.locator('#crp-paid-value-host .filter-sort-btn-text')).toHaveText('2568 (2025)');

    await page.getByRole('button', { name: 'ค้นหา' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.dashboard-table-empty')).toHaveCount(0);
    await expect(page.locator('#crp-table-count')).toContainText('แสดง 2 รายการ');
  });
});
