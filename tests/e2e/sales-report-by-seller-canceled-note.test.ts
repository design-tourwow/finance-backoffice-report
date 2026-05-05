import { test, expect, seedToken } from '../support/test-base';
import { factory } from '../fixtures/mock-backend';
import { makeMockJwt } from '../fixtures/mock-token';

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

  test('/sales-report-by-seller keeps canceled-orders drilldown in the same view-as scope', async ({ page, mockedBackend }) => {
    const adminViewAsToken = makeMockJwt({
      agencyMember: {
        id: 555,
        nick_name: 'Admin',
        job_position: 'admin',
      },
    });
    const ownCanceledOrder = factory.commissionPlusOrder(1, {
      seller_id: 77,
      seller_agency_member_id: '',
      seller_job_position: 'ts',
      net_amount: 109996,
      supplier_commission: 4500,
      discount: 0,
    });
    const otherCanceledOrder = factory.commissionPlusOrder(2, {
      seller_id: 88,
      seller_agency_member_id: '',
      seller_job_position: 'ts',
      net_amount: 50000,
      supplier_commission: 2000,
      discount: 0,
    });
    const canceledOrders = [
      ownCanceledOrder,
      otherCanceledOrder,
    ];
    const inflatedCanceledSummary = {
      total_net_amount: 159996,
      total_orders: 2,
      total_commission: 6500,
      total_discount: 0,
    };
    const seenCanceledQueries: Array<{ params: Record<string, string>; headers: Record<string, string> }> = [];

    await seedToken(page, adminViewAsToken);
    await page.addInitScript(() => {
      window.sessionStorage.setItem('viewAsRole', 'ts');
      window.sessionStorage.setItem('viewAsUserId', '77');
      window.sessionStorage.setItem('viewAsUserNick', 'ลูกน้ำ');
    });

    await mockedBackend({
      availablePeriods: {
        years: [
          {
            year_ce: 2026,
            label: '2569',
            total_orders: 12,
            quarters: [
              { quarter: 2, label: 'Q2', total_orders: 6 },
              { quarter: 1, label: 'Q1', total_orders: 6 },
            ],
            months: [
              { month: 5, label: 'พฤษภาคม', label_short: 'พ.ค.', total_orders: 4 },
              { month: 4, label: 'เมษายน', label_short: 'เม.ย.', total_orders: 4 },
              { month: 2, label: 'กุมภาพันธ์', label_short: 'ก.พ.', total_orders: 4 },
            ],
          },
        ],
      },
      commissionPlusSellers: {
        success: true,
        data: [
          factory.commissionPlusSeller(77),
          factory.commissionPlusSeller(78),
        ],
      },
    });

    await page.route(/\/api\/reports\/commission-plus(?:\?.*)?$/, async (route) => {
      const url = new URL(route.request().url());
      const params = Object.fromEntries(url.searchParams.entries());
      const headers = route.request().headers();

      if (params.order_status === 'canceled' && params.canceled_at_from === '2026-05-01') {
        seenCanceledQueries.push({ params, headers });
      }

      const isCanceledReference = params.order_status === 'canceled' && !!params.canceled_at_from;
      const body = isCanceledReference
        ? {
            success: true,
            data: {
              orders: canceledOrders,
              summary: inflatedCanceledSummary,
            },
          }
        : {
            success: true,
            data: {
              orders: [
                factory.commissionPlusOrder(9, {
                  seller_agency_member_id: 77,
                  seller_job_position: 'ts',
                  net_amount: 500000,
                  supplier_commission: 25000,
                  discount: 0,
                }),
              ],
              summary: summarize([
                factory.commissionPlusOrder(9, {
                  seller_agency_member_id: 77,
                  seller_job_position: 'ts',
                  net_amount: 500000,
                  supplier_commission: 25000,
                  discount: 0,
                }),
              ]),
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

    await page.locator('#crp-created-value-host .filter-sort-btn').click();
    await page.locator('#crp-created-value-host .filter-sort-option', { hasText: 'พฤษภาคม 2569 (2026)' }).click();
    await page.getByRole('button', { name: 'ค้นหา' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.kpi-note')).toContainText('109,996');
    await expect(page.locator('.kpi-note')).not.toContainText('159,996');

    await page.locator('#crp-created-value-host .filter-sort-btn').click();
    await page.locator('#crp-created-value-host .filter-sort-option', { hasText: 'กุมภาพันธ์ 2569 (2026)' }).click();

    await Promise.all([
      page.waitForURL(/\/canceled-orders\?/),
      page.locator('.kpi-note-link').click(),
    ]);
    await page.waitForLoadState('networkidle');

    expect(seenCanceledQueries.length).toBeGreaterThanOrEqual(2);
    const latestCanceledQuery = seenCanceledQueries[seenCanceledQueries.length - 1];
    expect(latestCanceledQuery.params).toMatchObject({
      canceled_at_from: '2026-05-01',
      canceled_at_to: '2026-05-31',
      created_at_to: '2026-04-30',
      seller_id: '77',
      job_position: 'ts',
      order_status: 'canceled',
    });
    expect(latestCanceledQuery.headers['x-view-as-role']).toBe('ts');
    expect(latestCanceledQuery.headers['x-view-as-user-id']).toBe('77');

    await expect(page.locator('#co-canceled-value-host .filter-sort-btn-text')).toHaveText('พฤษภาคม 2569 (2026)');
    await expect(page.locator('#co-created-relation-host .filter-sort-btn-text')).toHaveText('ก่อนช่วงที่ยกเลิก');
    await expect(page.locator('.dashboard-table-empty')).toHaveCount(0);
    await expect(page.locator('.crp-table tbody')).toContainText(ownCanceledOrder.order_code as string);
    await expect(page.locator('.crp-table tbody')).not.toContainText(otherCanceledOrder.order_code as string);
  });
});
