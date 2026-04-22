import type { Page, Route } from '@playwright/test';

/**
 * Central helper to stub all backend endpoints used by fe-2 pages +
 * existing project pages. Prevents R11 (prod pollution) — tests never
 * hit real backends.
 *
 * Usage:
 *   import { mockBackend } from '../fixtures/mock-backend';
 *   await mockBackend(page, { countries: [...], supplierReport: [...] });
 */

export interface MockBackendOptions {
  // Filter-service endpoints (from shared-filter-service.js)
  countries?: unknown[];
  teams?: unknown[];
  jobPositions?: unknown[];
  users?: unknown[];

  // Page-level report endpoints
  supplierReport?: unknown[];
  discountSalesReport?: unknown[];
  orderExternalSummary?: unknown[];
  orderHasDiscount?: unknown[];

  // Existing-project-api endpoints (add as needed)
  salesByCountry?: unknown;
  wholesaleDestinations?: unknown;
  workList?: unknown;

  // Simulate failures
  failFilterService?: boolean;
  failReport?: boolean;
  status401?: boolean;
  status500?: boolean;
  slowMs?: number;
}

const REPORT_API_BASE = 'https://be-2-report.vercel.app';
const FBR_BASE_STAGING = 'https://staging-finance-backoffice-report-api.vercel.app';
const FBR_BASE_PROD = 'https://finance-backoffice-report-api.vercel.app';

async function respond(route: Route, body: unknown, opts: MockBackendOptions): Promise<void> {
  if (opts.slowMs) {
    await new Promise((resolve) => setTimeout(resolve, opts.slowMs));
  }
  if (opts.status401) {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
    return;
  }
  if (opts.status500) {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body ?? []) });
}

export async function mockBackend(page: Page, opts: MockBackendOptions = {}): Promise<void> {
  // fe-2 filter-service endpoints
  await page.route(`${REPORT_API_BASE}/api/countries*`, (r) =>
    opts.failFilterService ? r.abort() : respond(r, opts.countries ?? [], opts)
  );
  await page.route(`${REPORT_API_BASE}/api/teams*`, (r) =>
    opts.failFilterService ? r.abort() : respond(r, opts.teams ?? [], opts)
  );
  await page.route(`${REPORT_API_BASE}/api/job-positions*`, (r) =>
    opts.failFilterService ? r.abort() : respond(r, opts.jobPositions ?? [], opts)
  );
  await page.route(`${REPORT_API_BASE}/api/users*`, (r) =>
    opts.failFilterService ? r.abort() : respond(r, opts.users ?? [], opts)
  );

  // fe-2 report endpoints
  await page.route(`${REPORT_API_BASE}/api/reports/supplier-performance*`, (r) =>
    opts.failReport ? r.abort() : respond(r, opts.supplierReport ?? [], opts)
  );
  await page.route(`${REPORT_API_BASE}/api/reports/sales-discount*`, (r) =>
    opts.failReport ? r.abort() : respond(r, opts.discountSalesReport ?? [], opts)
  );
  await page.route(`${REPORT_API_BASE}/api/reports/order-external-summary*`, (r) =>
    opts.failReport ? r.abort() : respond(r, opts.orderExternalSummary ?? [], opts)
  );
  await page.route(`${REPORT_API_BASE}/api/reports/order-has-discount*`, (r) =>
    opts.failReport ? r.abort() : respond(r, opts.orderHasDiscount ?? [], opts)
  );

  // finance-backoffice-report-api (existing pages) — stub both staging + prod
  for (const base of [FBR_BASE_STAGING, FBR_BASE_PROD]) {
    await page.route(`${base}/**`, (r) => respond(r, {}, opts));
  }
}

/** Factory sample data for common shapes. Override as needed per test. */
export const factory = {
  country: (i = 1) => ({ id: i, name_th: `ประเทศ ${i}`, name_en: `Country ${i}` }),
  team: (i = 1) => ({ team_number: i, name_th: `ทีม ${i}` }),
  jobPosition: (i = 1) => ({ job_position: `jp${i}`, type: 'ts', display_name: `TS ${i}` }),
  user: (i = 1) => ({ ID: i, user_id: `u${i}`, first_name: `First${i}`, last_name: `Last${i}`, nickname: `Nick${i}`, team_number: 1, job_position: 'jp1' }),
  supplier: (i = 1) => ({
    supplier_id: i,
    supplier_name_th: `ซัพพลายเออร์ ${i}`,
    supplier_name_en: `Supplier ${i}`,
    total_commission: 10000 + i * 1000,
    total_net_commission: 8000 + i * 800,
    total_pax: 50 + i,
    avg_commission_per_pax: 200 + i,
    avg_net_commission_per_pax: 160 + i,
  }),
};
