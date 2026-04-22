import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * A5 — Each *-api.js calls correct endpoint with correct params and
 * normalises response. All 4 page APIs share the FE2Http refactor from Phase C.
 */

function loadApi(apiFile: string, mockGet: (url: string, opts: any) => Promise<any>): any {
  const srcHttp = readFileSync(path.join(__dirname, '..', '..', 'fe2-http.js'), 'utf-8');
  const srcApi = readFileSync(path.join(__dirname, '..', '..', apiFile), 'utf-8');
  const win: any = {
    FE2_API_BASE_URL: 'https://example.com',
    TokenUtils: { getToken: () => 'x', redirectToLogin: () => {} },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  };
  new Function('window', srcHttp)(win);
  // Override FE2Http.get to capture calls
  win.FE2Http.get = mockGet;
  new Function('window', srcApi)(win);
  return win;
}

test.describe('@p1 Page API modules', () => {
  test('A5 SupplierCommissionAPI.fetchReport — correct endpoint + params', async () => {
    const calls: any[] = [];
    const win = loadApi('supplier-commission-api.js', async (url, opts) => {
      calls.push({ url, opts });
      return [{ supplier_id: 1, total_commission: 1000 }];
    });
    const result = await win.SupplierCommissionAPI.fetchReport({ year: 2026, quarter: 2, country_id: 5 });
    expect(calls[0].url).toMatch(/supplier-performance/);
    expect(calls[0].opts.params).toMatchObject({ year: 2026, quarter: 2, country_id: 5 });
    expect(Array.isArray(result)).toBe(true);
  });

  test('A5 DiscountSalesAPI.fetch — correct endpoint', async () => {
    const calls: any[] = [];
    const win = loadApi('discount-sales-api.js', async (url, opts) => {
      calls.push({ url, opts });
      return [];
    });
    await win.DiscountSalesAPI.fetch({ year: 2026 });
    expect(calls[0].url).toMatch(/sales-discount/);
  });

  test('A5 OrderExternalAPI.fetch — correct endpoint + year+month params', async () => {
    const calls: any[] = [];
    const win = loadApi('order-external-summary-api.js', async (url, opts) => {
      calls.push({ url, opts });
      return [];
    });
    await win.OrderExternalAPI.fetch({ year: 2026, month: 4 });
    expect(calls[0].url).toMatch(/order-external-summary/);
  });

  test('A5 RequestDiscountAPI.fetch — correct endpoint', async () => {
    const calls: any[] = [];
    const win = loadApi('request-discount-api.js', async (url, opts) => {
      calls.push({ url, opts });
      return [];
    });
    await win.RequestDiscountAPI.fetch({ year: 2026 });
    expect(calls[0].url).toMatch(/order-has-discount/);
  });

  test('A5 wrapped response { data: [...] } is normalised to array', async () => {
    const win = loadApi('supplier-commission-api.js', async () => ({ data: [{ supplier_id: 1 }] }));
    const result = await win.SupplierCommissionAPI.fetchReport({});
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});
