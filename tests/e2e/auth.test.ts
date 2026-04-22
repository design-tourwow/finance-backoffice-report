import { test, expect, navigateWithToken, seedToken } from '../support/test-base';

/**
 * E2, E3, E15 — JWT auth lifecycle tests. @p0 blocking.
 */

test.describe('@p0 JWT lifecycle', () => {
  test('E2 handoff — ?token=X saves to storage + cleans URL', async ({ page, mockedBackend, mockToken }) => {
    await mockedBackend();
    await navigateWithToken(page, '/supplier-commission', mockToken);
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => ({
      session: sessionStorage.getItem('authToken'),
      local: localStorage.getItem('authToken'),
      url: window.location.href,
    }));
    expect(stored.session).toBe(mockToken);
    expect(stored.local).toBe(mockToken);
    expect(stored.url).not.toContain('token=');
  });

  test('E3 missing token → redirect to login URL', async ({ page, mockedBackend }) => {
    await mockedBackend();
    await page.context().clearCookies();
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.clear();
    });

    // Intercept navigation to the login URL so we can verify WITHOUT actually
    // hitting financebackoffice.tourwow.com
    await page.route(/financebackoffice(-staging2)?\.tourwow\.com\/login/, (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Login</h1>' })
    );

    await page.goto('/supplier-commission');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/login/);
  });

  // E15 covers the 401 hang bug fixed in commit dd5db13. Before the fix,
  // multiple parallel 401s would leave the page waiting forever; after, a
  // 401 from the report API must redirect to the login URL. TokenUtils
  // calls alert() before redirect which blocks unless suppressed — stub
  // it out in the page context so the redirect always fires.
  test('E15 401 from report API → redirect to login', async ({ page, mockedBackend, mockToken }) => {
    await page.addInitScript(() => {
      window.alert = () => {};
    });
    await seedToken(page, mockToken);
    await page.route(/financebackoffice(-staging2)?\.tourwow\.com\/login/, (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Login</h1>' })
    );
    await mockedBackend({ status401: true });

    await page.goto('/supplier-commission');
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });
});
