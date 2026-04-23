import { test, expect, seedToken } from '../support/test-base';
import { makeMockJwt } from '../fixtures/mock-token';

test.describe('@p0 access control by job_position', () => {
  test('ts sees only dashboard + sales report menu entries', async ({ page, mockedBackend }) => {
    const tsToken = makeMockJwt({
      agencyMember: {
        id: 2,
        nick_name: 'TS User',
        job_position: 'ts'
      }
    });

    await seedToken(page, tsToken);
    await mockedBackend();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.nav-menu .nav-item')).toHaveCount(2);
    await expect(page.locator('.nav-menu .nav-item', { hasText: 'Dashboard' })).toBeVisible();
    await expect(page.locator('.nav-menu .nav-item', { hasText: 'Sales Report' })).toBeVisible();
    await expect(page.locator('.nav-menu .nav-item', { hasText: 'Tour Image Manager' })).toHaveCount(0);
    await expect(page.locator('.nav-menu .nav-item', { hasText: 'Sales by Country' })).toHaveCount(0);

    await expect(page.locator('.dashboard-card', { hasText: 'Sales Report' })).toBeVisible();
    await expect(page.locator('.dashboard-card', { hasText: 'Sales by Country' })).toHaveCount(0);
    await expect(page.locator('.dashboard-card', { hasText: 'Supplier Commission' })).toHaveCount(0);
  });

  test('crm is redirected away from disallowed route', async ({ page, mockedBackend }) => {
    const crmToken = makeMockJwt({
      agencyMember: {
        id: 3,
        nick_name: 'CRM User',
        job_position: 'crm'
      }
    });

    await seedToken(page, crmToken);
    await mockedBackend();
    await page.goto('/sales-by-country', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/403$/);
    await expect(page.getByText('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')).toBeVisible();
    await expect(page.getByRole('link', { name: 'กลับไปที่หน้าหลัก' })).toHaveAttribute('href', '/dashboard');
  });

  test('unauthenticated user is redirected to 401 page', async ({ page }) => {
    await page.goto('/request-discount', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/401$/);
    await expect(page.getByText('คุณยังไม่มีสิทธิ์เข้าใช้งานหน้านี้ กรุณาเข้าสู่ระบบใหม่ หรือกลับไปยังหน้าแรกของระบบ')).toBeVisible();
    await expect(page.getByRole('link', { name: 'กลับไปที่หน้าหลัก' })).toHaveAttribute('href', '/dashboard');
  });

  test('custom 404 page renders', async ({ page }) => {
    const response = await page.goto('/404', { waitUntil: 'domcontentloaded' });

    expect(response?.status(), 'HTTP status for /404').toBeLessThan(400);
    await expect(page.getByText('404 Not Found')).toBeVisible();
    await expect(page.getByText('ไม่พบหน้าที่คุณต้องการ อาจถูกย้าย ลบออก หรือพิมพ์ URL ไม่ถูกต้อง')).toBeVisible();
    await expect(page.getByRole('link', { name: 'กลับไปที่หน้าหลัก' })).toHaveAttribute('href', '/dashboard');
  });
});
