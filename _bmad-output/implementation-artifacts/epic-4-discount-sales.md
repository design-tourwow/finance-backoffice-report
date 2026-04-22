# Epic 4 — Discount Sales Implementation Artifact

## Files Modified / Created

| File | Action |
|------|--------|
| `discount-sales.html` | Modified — added Chart.js CDN in `<head>`, added `<script src="discount-sales-api.js">` before `discount-sales.js` |
| `discount-sales.css` | Created — full page-specific CSS (filter panel, cards, charts, table, sort buttons, badges) |
| `discount-sales-api.js` | Created — `window.DiscountSalesAPI` IIFE |
| `discount-sales.js` | Created — full page orchestration IIFE |

## Endpoint

`GET https://be-2-report.vercel.app/api/reports/sales-discount`

Query params: `year`, `quarter`, `month`, `country_id`, `job_position`, `team_number`, `user_id`

Auth: `Authorization: Bearer <token>` via `TokenUtils.getToken()`

## Chart Configuration (Chart.js)

| Chart | ID | Data source | Color |
|-------|----|-------------|-------|
| Top 8 ส่วนลด (จำนวนเงิน) | `ds-chart-amount` | sorted by `total_discount` desc, top 8 | `#EF4444` |
| Top 10 ส่วนลด (เปอร์เซ็นต์) | `ds-chart-percent` | sorted by `discount_percentage` desc, top 10 | `#FF8042` |

Both charts: type `bar`, responsive, 320px height, x-axis labels rotated 30–45°, rich tooltip with discount/commission/percentage.

## Sort Keys

Table columns sortable on: `total_commission`, `total_discount`, `discount_percentage`, `order_count`, `net_commission`

Default sort on load: `total_commission` desc. Clicking same column toggles asc/desc. Icon reflects state.

## Deviations from Reference

- React Recharts replaced with Chart.js (CDN already on page pattern).
- `filterAndDisplayJobPositions` called without `teamId` argument (matches fe-2 ref; team filtering is done client-side in user dropdown refresh).
- Auto-load on mount after dropdowns populated (matching ref's `useEffect` on filter deps).

## Verification Steps

1. Open `/discount-sales` (local or Vercel).
2. Confirm sidebar, breadcrumb, page header render correctly.
3. Dropdowns populate: countries (Thai-sorted), teams, job positions (ts/crm only), users.
4. Change team → user list narrows. Change job position → user list narrows.
5. Click **Apply** → summary cards, two bar charts, and table appear.
6. Click column header → table sorts; click again → reverses.
7. Disconnect network → click Apply → inline red error message, no crash.
8. Click **Export CSV** → `.csv` downloads with UTF-8 BOM.
9. Switch filter mode to quarterly / monthly / yearly / all → period selectors show/hide correctly.
