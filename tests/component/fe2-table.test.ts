import { test, expect } from '@playwright/test';

const harnessHtml = `
<!DOCTYPE html>
<html><head>
<script src="/fe2-table.js"></script>
</head><body><div id="root"></div></body></html>
`;

test.describe('@p1 FE2Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/harness-table.html', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: harnessHtml })
    );
    await page.goto('/harness-table.html');
  });

  test('C3 render — columns + rows displayed, sortable header calls onSort', async ({ page }) => {
    await page.evaluate(() => {
      const root = document.getElementById('root')!;
      (window as any).__sortCalls = [];
      (window as any).FE2Table.render({
        containerEl: root,
        columns: [
          { key: 'name', label: 'ชื่อ', sortable: false },
          { key: 'amount', label: 'ยอด', sortable: true, align: 'right' },
        ],
        rows: [
          { name: 'Alice', amount: 100 },
          { name: 'Bob', amount: 200 },
        ],
        sortKey: 'amount',
        sortDir: 'desc',
        onSort: (k: string) => (window as any).__sortCalls.push(k),
      });
    });

    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th, [role=columnheader]')).toHaveCount(2);
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.getByText('Alice')).toBeVisible();

    // Click sortable header
    await page.getByText('ยอด').click();
    const calls = await page.evaluate(() => (window as any).__sortCalls);
    expect(calls).toContain('amount');
  });

  test('@p2 C4 render — sort direction indicator reflects sortDir', async ({ page }) => {
    await page.evaluate(() => {
      const root = document.getElementById('root')!;
      (window as any).FE2Table.render({
        containerEl: root,
        columns: [{ key: 'x', label: 'X', sortable: true }],
        rows: [{ x: 1 }, { x: 2 }],
        sortKey: 'x',
        sortDir: 'asc',
        onSort: () => {},
      });
    });
    const sortIndicator = page.locator('[aria-sort]').first();
    await expect(sortIndicator).toHaveAttribute('aria-sort', /asc|ascending/i);
  });
});
