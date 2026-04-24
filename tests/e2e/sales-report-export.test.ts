import { test, expect, seedToken } from '../support/test-base';
import { factory } from '../fixtures/mock-backend';

test.describe('@p1 Sales Report Excel export', () => {
  test('/sales-report downloads workbook with 3 worksheets', async ({ page, mockedBackend, mockToken }) => {
    const orders = [
      factory.commissionPlusOrder(1, { seller_nick_name: 'Pink', seller_job_position: 'ts', discount: 5000, supplier_commission: 69000, net_amount: 1175671, room_quantity: 4 }),
      factory.commissionPlusOrder(2, { seller_nick_name: 'ปูเป้', seller_job_position: 'ts', discount: 4800, supplier_commission: 55976, net_amount: 1050548, room_quantity: 3 }),
      factory.commissionPlusOrder(3, { seller_nick_name: 'ต้อมแต้ม', seller_job_position: 'crm', discount: 2350, supplier_commission: 26370, net_amount: 620714, room_quantity: 2 }),
      factory.commissionPlusOrder(4, { seller_nick_name: 'Toon', seller_job_position: 'crm', discount: 2600, supplier_commission: 19000, net_amount: 327466, room_quantity: 2 }),
    ];

    await seedToken(page, mockToken);
    await mockedBackend({
      availablePeriods: factory.availablePeriods(),
      commissionPlusSellers: {
        success: true,
        data: [
          factory.commissionPlusSeller(1),
          factory.commissionPlusSeller(2),
          factory.commissionPlusSeller(3),
        ],
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

    const exportBtn = page.getByRole('button', { name: /Export Excel/i });
    await expect(exportBtn).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5_000 }),
      exportBtn.click(),
    ]);

    await expect(download.suggestedFilename()).toMatch(/^sales-report-\d{8}\.xls$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) chunks.push(Buffer.from(chunk));
    const content = Buffer.concat(chunks).toString('utf8');

    expect(content).toContain('Worksheet ss:Name="sales-report"');
    expect(content).toContain('Worksheet ss:Name="sales-report-by-telesales"');
    expect(content).toContain('Worksheet ss:Name="sales-report-by-crm"');
    expect(content).toContain('Pink');
    expect(content).toContain('ต้อมแต้ม');
    expect(content).toContain('Toon');
    expect(content).toContain('ลูกค้า 1');
  });
});
