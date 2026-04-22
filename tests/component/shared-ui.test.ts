import { test, expect } from '@playwright/test';

/**
 * Component test sample (C1, C2). Uses real browser to verify DOM injection
 * since shared-ui.js relies on document.createElement + appendChild.
 *
 * Strategy: serve a minimal HTML harness that loads shared-ui.js + shared-ui.css
 * via the dev server, then assert DOM contract.
 */

const harnessHtml = `
<!DOCTYPE html>
<html><head>
<link rel="stylesheet" href="/shared-ui.css" />
<script src="/shared-ui.js"></script>
</head><body><div id="root"></div></body></html>
`;

test.describe('@p0 SharedUI', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/harness.html', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: harnessHtml })
    );
    await page.goto('/harness.html');
  });

  test('C1 showLoading injects spinner + aria-live="polite"', async ({ page }) => {
    await page.evaluate(() => {
      const root = document.getElementById('root')!;
      (window as any).SharedUI.showLoading(root, 'กำลังโหลด...');
    });
    const loading = page.locator('.shared-loading').first();
    await expect(loading).toBeVisible();
    await expect(loading).toHaveAttribute('aria-live', 'polite');
    await expect(loading).toContainText('กำลังโหลด');
  });

  test('C2 showError injects banner + role="alert"', async ({ page }) => {
    await page.evaluate(() => {
      const root = document.getElementById('root')!;
      (window as any).SharedUI.showError(root, 'ไม่พบข้อมูล');
    });
    const error = page.locator('.shared-error-banner').first();
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(error).toContainText('ไม่พบข้อมูล');
  });
});
