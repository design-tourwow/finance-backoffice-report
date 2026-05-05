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

test.describe('@p1 Sales Report traveler toggle', () => {
  test('/sales-report checkbox switches between travelers-only and all orders', async ({ page, mockedBackend, mockToken }) => {
    const orders = [
      factory.commissionPlusOrder(1, {
        order_code: 'TRAVELER-001',
        net_amount: 100,
        supplier_commission: 10,
        discount: 1,
        room_quantity: 2,
      }),
      factory.commissionPlusOrder(2, {
        order_code: 'TRAVELER-002',
        net_amount: 200,
        supplier_commission: 20,
        discount: 2,
        room_quantity: 1,
      }),
      factory.commissionPlusOrder(3, {
        order_code: 'ZERO-003',
        net_amount: 300,
        supplier_commission: 30,
        discount: 3,
        room_quantity: 0,
      }),
    ];

    await seedToken(page, mockToken);
    await mockedBackend({
      availablePeriods: factory.availablePeriods(),
      commissionPlusSellers: {
        success: true,
        data: [
          factory.commissionPlusSeller(1),
          factory.commissionPlusSeller(2),
        ],
      },
      commissionPlusReport: {
        success: true,
        data: {
          orders,
          summary: summarize(orders),
        },
      },
    });

    await page.goto('/sales-report');
    await page.waitForLoadState('networkidle');

    const travelerToggle = page.getByLabel('นับ Order ที่มีผู้เดินทางเท่านั้น');
    await expect(travelerToggle).toBeChecked();
    await expect(page.locator('#crp-table-count')).toContainText('แสดง 2 รายการ');
    await expect(page.locator('.dashboard-kpi-card .kpi-value').first()).toHaveText('300');
    await expect(page.locator('.crp-order-code')).toHaveCount(2);
    await expect(page.locator('.crp-table tbody')).not.toContainText('ZERO-003');

    await travelerToggle.uncheck();

    await expect(travelerToggle).not.toBeChecked();
    await expect(page.locator('#crp-table-count')).toContainText('แสดง 3 รายการ');
    await expect(page.locator('.dashboard-kpi-card .kpi-value').first()).toHaveText('600');
    await expect(page.locator('.crp-table tbody')).toContainText('ZERO-003');
  });
});
