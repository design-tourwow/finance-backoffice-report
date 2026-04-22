# Epic 6 — Request Discount Implementation Artifact

## Files Changed

| File | Action |
|------|--------|
| `request-discount-api.js` | NEW — IIFE, exposes `window.RequestDiscountAPI.fetch(params)` |
| `request-discount.css` | REPLACED placeholder — full page CSS |
| `request-discount.js` | REPLACED placeholder — full page logic |
| `request-discount.html` | EDITED — added Chart.js CDN in `<head>`, `request-discount-api.js` before `request-discount.js` |

## Endpoint Called

`GET https://be-2-report.vercel.app/api/reports/order-has-discount`

Query params: `year`, `quarter`, `month`, `country_id`, `job_position`, `team_number`, `user_id`
- `year` is omitted when `filterMode === 'all'`
- `quarter`/`month` only sent for their respective modes

## Chart Config (Chart.js)

| Chart | Type | Dataset key | Color | Slice |
|-------|------|-------------|-------|-------|
| Top 8 ส่วนลด (จำนวนเงิน) | Bar | `total_discount` | `#EF4444` | top 8 by total_discount |
| Top 10 ส่วนลด (เปอร์เซ็นต์) | Bar | `avg_discount_percent` | `#FF8042` | top 10 by avg_discount_percent |

Both charts rotate X labels 45°, have custom tooltips.

## Sort Keys (Orders Detail Table)

`order_code`, `created_at`, `customer`, `seller`, `crm`, `net_amount`, `commission`, `discount`, `discount_pct`
Toggle asc/desc per column. Default sort: created_at desc (from API load).

## In-Memory Filter Fields (Story 6.3)

`allOrdersData` is loaded ONCE per API filter change. Two checkboxes re-filter without API calls:
- `showDiscountOnly` → keeps `financial_metrics.discount >= 1`
- `showUnpaidOnly` → keeps records where `payment_details.status_list` does NOT include 'paid'

`displayData` = result of checkbox filtering from `allOrdersData`.
Chart/KPI summary always computed from `allOrdersData` (matches React reference behavior).

## Deviations from React Reference

1. No React pagination state — uses closure variable `currentPage`.
2. No `usePageLoading` hook — uses inline loading HTML.
3. Filter selects re-render via `renderFilterPanel()` instead of React state; team/job cascade calls `updateFilteredUsers()` then re-renders panel.
4. Job position and team selects trigger API reload (matching React `useEffect([...selectedTeam, selectedJobPosition...])`).

## Verification Steps

1. Open `/request-discount` in browser — page loads, sidebar/topbar render.
2. Confirm initial load calls `/api/reports/order-has-discount` with Q+year params.
3. Change country/team/job/period → confirm new API call, table re-renders.
4. Toggle "แสดงเฉพาะ Order ที่มีส่วนลด" checkbox → table changes WITHOUT network request (check DevTools Network tab).
5. Click column header → row order changes asc/desc.
6. Both bar charts render with Thai tooltip text.
7. Export CSV → file downloads with UTF-8 BOM (opens correctly in Excel).
8. Simulate API error (block request in DevTools) → red error banner appears, no JS crash.
