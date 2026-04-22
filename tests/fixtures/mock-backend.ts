import type { Page, Route } from '@playwright/test';

/**
 * Central helper to stub backend endpoints for both report pages and
 * existing project pages. After Phase 2 (commit 1ce6825) every page hits
 * our own finance-backoffice-report-api; the external be-2-report host
 * is retired. Routes are registered against both staging and prod bases
 * because localhost uses hostname detection to pick either one.
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

const FBR_BASES = [
  'https://staging-finance-backoffice-report-api.vercel.app',
  'https://finance-backoffice-report-api.vercel.app',
] as const;

// tour-image-manager is the only legacy page pointing at a different backend.
const LEGACY_BASES = [
  'https://fin-api.tourwow.com',
  'https://fin-api-staging2.tourwow.com',
] as const;

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
  for (const base of FBR_BASES) {
    // Filter-service endpoints
    await page.route(`${base}/api/countries*`, (r) =>
      opts.failFilterService ? r.abort() : respond(r, opts.countries ?? [], opts)
    );
    await page.route(`${base}/api/teams*`, (r) =>
      opts.failFilterService ? r.abort() : respond(r, opts.teams ?? [], opts)
    );
    await page.route(`${base}/api/job-positions*`, (r) =>
      opts.failFilterService ? r.abort() : respond(r, opts.jobPositions ?? [], opts)
    );
    // shared-filter-service.js now calls /api/agency-members (our backend
    // reserves /api/users for chat users). Semantics match fe-2 /api/users.
    await page.route(`${base}/api/agency-members*`, (r) =>
      opts.failFilterService ? r.abort() : respond(r, opts.users ?? [], opts)
    );

    // Report endpoints
    await page.route(`${base}/api/reports/supplier-performance*`, (r) =>
      opts.failReport ? r.abort() : respond(r, opts.supplierReport ?? [], opts)
    );
    await page.route(`${base}/api/reports/sales-discount*`, (r) =>
      opts.failReport ? r.abort() : respond(r, opts.discountSalesReport ?? [], opts)
    );
    await page.route(`${base}/api/reports/order-external-summary*`, (r) =>
      opts.failReport ? r.abort() : respond(r, opts.orderExternalSummary ?? [], opts)
    );
    await page.route(`${base}/api/reports/order-has-discount*`, (r) =>
      opts.failReport ? r.abort() : respond(r, opts.orderHasDiscount ?? [], opts)
    );

    // Fallback for any other FBR endpoint (existing-project pages,
    // health-checks, unmocked routes). Honors opts.status* so auth/slow
    // simulations still apply uniformly.
    await page.route(`${base}/**`, (r) => respond(r, {}, opts));
  }

  // tour-image-manager hits the legacy fin-api host. Keep its traffic
  // stubbed so regression tests don't leak to a real backend.
  for (const base of LEGACY_BASES) {
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
    metrics: {
      total_commission: 10000 + i * 1000,
      total_net_commission: 8000 + i * 800,
      total_pax: 50 + i,
      avg_commission_per_pax: 200 + i,
      avg_net_commission_per_pax: 160 + i,
    },
  }),
};
