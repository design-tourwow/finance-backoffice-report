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
  availablePeriods?: unknown;

  // Page-level report endpoints
  supplierReport?: unknown[];
  discountSalesReport?: unknown[];
  orderExternalSummary?: unknown[];
  orderHasDiscount?: unknown[];
  commissionPlusReport?: unknown;
  commissionPlusSellers?: unknown;

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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    // Fallback for any other FBR endpoint (existing-project pages,
    // health-checks, unmocked routes). Register this first so the
    // endpoint-specific mocks below win.
    await page.route(`${base}/**`, (r) => respond(r, {}, opts));

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
    await page.route(`${base}/api/reports/available-periods*`, (r) =>
      opts.failFilterService ? r.abort() : respond(r, opts.availablePeriods ?? factory.availablePeriods(), opts)
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
    await page.route(new RegExp(`^${escapeRegExp(base)}/api/reports/commission-plus/sellers(?:\\?.*)?$`), (r) =>
      opts.failReport ? r.abort() : respond(r, opts.commissionPlusSellers ?? { success: true, data: [] }, opts)
    );
    await page.route(new RegExp(`^${escapeRegExp(base)}/api/reports/commission-plus(?:\\?.*)?$`), (r) =>
      opts.failReport ? r.abort() : respond(r, opts.commissionPlusReport ?? { success: true, data: { orders: [], summary: {} } }, opts)
    );
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
  availablePeriods: () => ({
    years: [
      {
        year_ce: 2026,
        label: '2569',
        total_orders: 12,
        quarters: [
          { quarter: 2, label: 'Q2', total_orders: 6 },
          { quarter: 1, label: 'Q1', total_orders: 6 },
        ],
        months: [
          { month: 4, label: 'เมษายน', label_short: 'เม.ย.', total_orders: 2 },
          { month: 3, label: 'มีนาคม', label_short: 'มี.ค.', total_orders: 2 },
          { month: 2, label: 'กุมภาพันธ์', label_short: 'ก.พ.', total_orders: 4 },
          { month: 1, label: 'มกราคม', label_short: 'ม.ค.', total_orders: 4 },
        ],
      },
      {
        year_ce: 2025,
        label: '2568',
        total_orders: 8,
        quarters: [
          { quarter: 4, label: 'Q4', total_orders: 4 },
          { quarter: 3, label: 'Q3', total_orders: 4 },
        ],
        months: [
          { month: 12, label: 'ธันวาคม', label_short: 'ธ.ค.', total_orders: 2 },
          { month: 11, label: 'พฤศจิกายน', label_short: 'พ.ย.', total_orders: 2 },
          { month: 10, label: 'ตุลาคม', label_short: 'ต.ค.', total_orders: 2 },
          { month: 9, label: 'กันยายน', label_short: 'ก.ย.', total_orders: 2 },
        ],
      },
    ],
  }),
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
  discountSale: (i = 1) => ({
    sales_id: i,
    nickname: `เซลล์ ${i}`,
    sales_name: `Sales ${i}`,
    metrics: {
      total_commission: 15000 + i * 1000,
      total_discount: 2000 + i * 100,
      discount_percentage: 5 + i,
      order_count: 10 + i,
      net_commission: 13000 + i * 900,
    },
  }),
  orderExternal: (i = 1) => ({
    order_code: `TWP2604${String(i).padStart(4, '0')}`,
    created_at: `2026-04-${String(i).padStart(2, '0')}T10:00:00Z`,
    customer_name: `ลูกค้า ${i}`,
    net_amount: 100000 + i * 1000,
    supplier_commission: 12000 + i * 500,
    discount: 1000 + i * 100,
    paid_at: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
    seller_nickname: `Nick${i}`,
  }),
  orderHasDiscount: (i = 1) => ({
    order_info: {
      order_code: `ORD-${i}`,
      created_at: `2026-04-${String(i).padStart(2, '0')}T10:00:00Z`,
    },
    customer_info: {
      customer_name: `Customer ${i}`,
    },
    sales_crm: {
      seller_name: `Seller ${i}`,
      crm_name: `CRM ${i}`,
    },
    payment_details: {
      status_list: i % 2 === 0 ? ['pending'] : ['paid'],
    },
    financial_metrics: {
      net_amount: 50000 + i * 1000,
      supplier_commission: 5000 + i * 200,
      discount: 1000 + i * 100,
      discount_percent: 5 + i,
    },
  }),
  commissionPlusSeller: (i = 1) => ({
    id: i,
    first_name: `Seller${i}`,
    last_name: `Last${i}`,
    nick_name: `Nick${i}`,
  }),
  commissionPlusOrder: (i = 1, overrides: Record<string, unknown> = {}) => ({
    seller_nick_name: `Nick${i}`,
    seller_job_position: i % 2 === 0 ? 'crm' : 'ts',
    order_code: `TWP2604${String(i).padStart(4, '0')}`,
    created_at: `2026-04-${String(i).padStart(2, '0')}T10:00:00Z`,
    customer_name: `ลูกค้า ${i}`,
    country_name_th: `ประเทศ ${i}`,
    product_period_snapshot: `10-12/04/2569`,
    net_amount: 100000 + i * 1000,
    room_quantity: i + 1,
    first_paid_at: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
    supplier_commission: 12000 + i * 500,
    discount: 1000 + i * 100,
    ...overrides,
  }),
};
