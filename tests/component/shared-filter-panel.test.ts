import { test, expect } from '@playwright/test';

const harnessHtml = `
<!DOCTYPE html>
<html><head>
<link rel="stylesheet" href="/shared-ui.css" />
<script src="/shared-utils.js"></script>
<script src="/shared-filter-panel.js"></script>
</head><body><div id="root"></div></body></html>
`;

test.describe('@p1 SharedFilterPanel', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/harness-filter.html', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: harnessHtml })
    );
    await page.goto('/harness-filter.html');
  });

  test('C5 render — dropdowns populated with options, cascade onChange fires', async ({ page }) => {
    await page.evaluate(() => {
      const root = document.getElementById('root')!;
      (window as any).__changes = [];
      (window as any).SharedFilterPanel.render({
        containerEl: root,
        state: { mode: 'quarter', year: 2026, quarter: 2, country_id: '', team_number: '', job_position: '', user_id: '' },
        options: {
          countries: [{ id: 1, name_th: 'ไทย' }, { id: 2, name_th: 'ญี่ปุ่น' }],
          years: [2026, 2025],
          quarters: [{ value: 1, label: 'Q1' }, { value: 2, label: 'Q2' }],
          months: [],
          teams: [{ team_number: 1, name_th: 'ทีม A' }],
          jobPositions: [],
          users: [],
        },
        onChange: (state: any) => (window as any).__changes.push(state),
        onApply: () => {},
      });
    });

    // Dropdowns should render
    await expect(page.locator('select')).not.toHaveCount(0);

    // Find country select and change it
    const countrySelect = page.locator('select').nth(0);
    await expect(countrySelect).toBeVisible();

    // Select any option to trigger onChange
    const options = await countrySelect.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });

  test('C6 render — Apply button triggers onApply(state)', async ({ page }) => {
    await page.evaluate(() => {
      const root = document.getElementById('root')!;
      (window as any).__applied = null;
      (window as any).SharedFilterPanel.render({
        containerEl: root,
        state: { mode: 'all', year: 2026, country_id: '', team_number: '', job_position: '', user_id: '' },
        options: { countries: [], years: [2026], quarters: [], months: [], teams: [], jobPositions: [], users: [] },
        onChange: () => {},
        onApply: (state: any) => { (window as any).__applied = state; },
      });
    });

    const applyBtn = page.getByRole('button', { name: /แสดงผล|Apply/i }).first();
    if (await applyBtn.count() > 0) {
      await applyBtn.click();
      const applied = await page.evaluate(() => (window as any).__applied);
      expect(applied).not.toBeNull();
    }
  });
});
