import { test, expect, seedToken } from '../support/test-base';
import { factory } from '../fixtures/mock-backend';

function summarize(orders: Array<Record<string, unknown>>) {
  return {
    total_net_amount: orders.reduce((sum, row) => sum + Number(row.net_amount || 0), 0),
    total_orders: orders.length,
    total_commission: orders.reduce((sum, row) => sum + Number(row.supplier_commission || 0), 0),
    total_discount: orders.reduce((sum, row) => sum + Number(row.discount || 0), 0),
  };
}

function dateOnly(value: unknown): string {
  return String(value || '').slice(0, 10);
}

function matchesRange(value: unknown, from: string, to: string): boolean {
  const current = dateOnly(value);
  if (!current) return false;
  if (from && current < from) return false;
  if (to && current > to) return false;
  return true;
}

test.describe('@p1 Sales Report linked periods', () => {
  test('/sales-report narrows the opposite date filter to periods with matching data', async ({ page, mockedBackend, mockToken }) => {
    const orders = [
      factory.commissionPlusOrder(1, {
        order_code: 'TWP26120001',
        created_at: '2026-04-08T10:00:00Z',
        first_paid_at: '2026-04-09T10:00:00Z',
      }),
      factory.commissionPlusOrder(2, {
        order_code: 'TWP25100001',
        created_at: '2025-10-03T10:00:00Z',
        first_paid_at: '2025-09-29T10:00:00Z',
      }),
      factory.commissionPlusOrder(3, {
        order_code: 'TWP25100002',
        created_at: '2025-10-17T10:00:00Z',
        first_paid_at: '2025-11-04T10:00:00Z',
      }),
      factory.commissionPlusOrder(4, {
        order_code: 'TWP25090001',
        created_at: '2025-09-10T10:00:00Z',
        first_paid_at: '2025-10-12T10:00:00Z',
      }),
    ];

    await seedToken(page, mockToken);
    await mockedBackend({
      availablePeriods: factory.availablePeriods(),
      commissionPlusSellers: {
        success: true,
        data: [factory.commissionPlusSeller(1), factory.commissionPlusSeller(2)],
      },
    });

    await page.route(/\/api\/reports\/commission-plus(?:\?.*)?$/, async (route) => {
      const url = new URL(route.request().url());
      const createdFrom = url.searchParams.get('created_at_from') || '';
      const createdTo = url.searchParams.get('created_at_to') || '';
      const paidFrom = url.searchParams.get('paid_at_from') || '';
      const paidTo = url.searchParams.get('paid_at_to') || '';

      const filtered = orders.filter((order) => {
        return matchesRange(order.created_at, createdFrom, createdTo)
          && matchesRange(order.first_paid_at, paidFrom, paidTo);
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            orders: filtered,
            summary: summarize(filtered),
          },
        }),
      });
    });

    await page.goto('/sales-report');
    await page.waitForLoadState('networkidle');

    await page.locator('#crp-created-value-host .filter-sort-btn').click();
    await page.locator('#crp-created-value-host .filter-sort-option', { hasText: 'ตุลาคม 2568 (2025)' }).click();

    await expect(page.locator('#crp-paid-mode-host .filter-sort-btn-text')).toHaveText('ทั้งหมด');

    await page.locator('#crp-paid-mode-host .filter-sort-btn').click();
    await page.locator('#crp-paid-mode-host .filter-sort-option', { hasText: 'รายเดือน' }).click();
    await page.locator('#crp-paid-value-host .filter-sort-btn').click();

    await expect(page.locator('#crp-paid-value-host .filter-sort-option', { hasText: 'กันยายน 2568 (2025)' })).toHaveCount(1);
    await expect(page.locator('#crp-paid-value-host .filter-sort-option', { hasText: 'พฤศจิกายน 2568 (2025)' })).toHaveCount(1);
    await expect(page.locator('#crp-paid-value-host .filter-sort-option', { hasText: 'ตุลาคม 2568 (2025)' })).toHaveCount(0);

    await page.locator('#crp-paid-value-host .filter-sort-option', { hasText: 'พฤศจิกายน 2568 (2025)' }).click();
    await page.getByRole('button', { name: 'ค้นหา' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.dashboard-table-empty')).toHaveCount(0);
    await expect(page.locator('#crp-table-count')).toContainText('แสดง 1 รายการ');
    await expect(page.locator('.crp-order-code')).toContainText('TWP25100002');
  });
});
