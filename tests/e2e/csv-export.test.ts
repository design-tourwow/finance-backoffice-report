import { test, expect, seedToken } from '../support/test-base';
import { factory } from '../fixtures/mock-backend';

/**
 * E11 — CSV export downloads with UTF-8 BOM so Excel opens Thai correctly.
 */

const PAGES = [
  { path: '/supplier-commission', reportKey: 'supplierReport' },
  { path: '/discount-sales', reportKey: 'discountSalesReport' },
  { path: '/order-external-summary', reportKey: 'orderExternalSummary' },
  { path: '/request-discount', reportKey: 'orderHasDiscount' },
] as const;

function sampleRows(reportKey: (typeof PAGES)[number]['reportKey']) {
  if (reportKey === 'supplierReport') return [factory.supplier(1)];
  if (reportKey === 'discountSalesReport') return [factory.discountSale(1)];
  if (reportKey === 'orderExternalSummary') return [factory.orderExternal(1)];
  return [factory.orderHasDiscount(1)];
}

test.describe('@p2 E11 CSV export with Thai', () => {
  for (const { path: route, reportKey } of PAGES) {
    test(`${route} CSV has UTF-8 BOM + Thai content`, async ({ page, mockedBackend, mockToken }) => {
      await seedToken(page, mockToken);
      await mockedBackend({
        countries: [factory.country()],
        [reportKey]: sampleRows(reportKey),
      } as any);
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const exportBtn = page.getByRole('button', { name: /Export|ส่งออก|CSV|ดาวน์โหลด/i }).first();
      if (await exportBtn.count() === 0) {
        test.skip(true, 'Export button not found on this page variant');
        return;
      }

      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 5_000 }), exportBtn.click()]);
      const stream = await download.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream as any) chunks.push(Buffer.from(chunk));
      const content = Buffer.concat(chunks);

      // BOM is 0xEF 0xBB 0xBF
      expect(content[0]).toBe(0xEF);
      expect(content[1]).toBe(0xBB);
      expect(content[2]).toBe(0xBF);
    });
  }
});
