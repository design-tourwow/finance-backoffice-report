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

test.describe('@p1 Sales Report by Seller canceled reference note', () => {
  test('/sales-report-by-seller maps created period to canceled-orders filters', async ({ page, mockedBackend, mockToken }) => {
    const mainOrders = [
      factory.commissionPlusOrder(1, {
        order_code: 'MAIN-001',
        net_amount: 884083,
        supplier_commission: 57050,
        discount: 1004,
        room_quantity: 2,
      }),
    ];
    const canceledOrders = [
      factory.commissionPlusOrder(2, {
        order_code: 'CANCEL-001',
        net_amount: 103470,
        supplier_commission: 4500,
        discount: 0,
        room_quantity: 3,
      }),
    ];
    const seenQueries: Array<Record<string, string>> = [];

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
      const params = Object.fromEntries(url.searchParams.entries());
      seenQueries.push(params);

      const isCanceledReference = params.order_status === 'canceled' && !!params.canceled_at_from;
      const body = isCanceledReference
        ? {
            success: true,
            data: {
              orders: canceledOrders,
              summary: summarize(canceledOrders),
            },
          }
        : {
            success: true,
            data: {
              orders: mainOrders,
              summary: summarize(mainOrders),
            },
          };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.goto('/sales-report-by-seller');
    await page.waitForLoadState('networkidle');

    seenQueries.length = 0;

    await page.locator('#crp-created-value-host .filter-sort-btn').click();
    await page.locator('#crp-created-value-host .filter-sort-option', { hasText: 'ตุลาคม 2568 (2025)' }).click();
    await page.getByRole('button', { name: 'ค้นหา' }).click();
    await page.waitForLoadState('networkidle');

    const mainQuery = seenQueries.find((query) => query.order_status === 'not_canceled');
    expect(mainQuery).toBeTruthy();
    expect(mainQuery).toMatchObject({
      created_at_from: '2025-10-01',
      created_at_to: '2025-10-31',
      job_position: 'admin',
      order_status: 'not_canceled',
    });

    const canceledQuery = seenQueries.find((query) => query.order_status === 'canceled' && query.canceled_at_from === '2025-10-01');
    expect(canceledQuery).toBeTruthy();
    expect(canceledQuery).toMatchObject({
      canceled_at_from: '2025-10-01',
      canceled_at_to: '2025-10-31',
      created_at_to: '2025-09-30',
      job_position: 'admin',
      order_status: 'canceled',
    });
    expect(canceledQuery && canceledQuery.created_at_from).toBeUndefined();

    await expect(page.locator('.kpi-note')).toContainText('103,470');
    await expect(page.locator('.kpi-note-link')).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/canceled-orders\?/),
      page.locator('.kpi-note-link').click(),
    ]);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#co-canceled-mode-host .filter-sort-btn-text')).toHaveText('รายเดือน');
    await expect(page.locator('#co-canceled-value-host .filter-sort-btn-text')).toHaveText('ตุลาคม 2568 (2025)');
    await expect(page.locator('#co-created-relation-host .filter-sort-btn-text')).toHaveText('ก่อนช่วงที่ยกเลิก');
  });
});
