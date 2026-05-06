import { test, expect, seedToken } from '../support/test-base';
import { factory } from '../fixtures/mock-backend';

test.describe('@p1 Canceled Orders table layout', () => {
  test('/canceled-orders shows canceled date as the first table column', async ({ page, mockedBackend, mockToken }) => {
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
          orders: [
            factory.commissionPlusOrder(1, {
              seller_agency_member_id: 1,
              canceled_at: '2026-04-08T10:00:00Z',
            }),
          ],
          summary: {
            total_net_amount: 101000,
            total_orders: 1,
            total_commission: 12500,
            total_discount: 1100,
          },
        },
      },
    });

    await page.goto('/canceled-orders');
    await page.waitForLoadState('networkidle');

    const headers = page.locator('.crp-table thead tr.col-row th');
    await expect(headers.nth(0)).toHaveText('วันที่ยกเลิก');
    await expect(headers.nth(1)).toHaveText('เซลล์');

    const firstRowCells = page.locator('.crp-table tbody tr').first().locator('td');
    await expect(firstRowCells.nth(0)).toHaveText('08/04/2569');
  });
});
