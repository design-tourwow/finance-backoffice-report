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

['/sales-report', '/sales-report-by-seller'].forEach((path) => {
  test(`${path} shows discount percentage beside total discount`, async ({ page, mockedBackend, mockToken }) => {
    const orders = [
      factory.commissionPlusOrder(1, {
        order_code: 'PERCENT-001',
        net_amount: 2000,
        discount: 100,
        supplier_commission: 300,
        room_quantity: 2,
      }),
    ];

    await seedToken(page, mockToken);
    await mockedBackend({
      availablePeriods: factory.availablePeriods(),
      commissionPlusSellers: {
        success: true,
        data: [factory.commissionPlusSeller(1)],
      },
      commissionPlusReport: {
        success: true,
        data: {
          orders,
          summary: summarize(orders),
        },
      },
    });

    await page.goto(path);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.crp-table thead tr.col-row th').last()).toHaveText('เปอร์เซ็นต์');
    await expect(page.locator('.crp-table tbody tr').first()).toContainText('5.00%');
  });
});
