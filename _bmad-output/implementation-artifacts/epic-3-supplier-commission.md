# Epic 3 — Supplier Commission: Implementation Record

## Files Created / Modified

| File | Action |
|---|---|
| `supplier-commission-api.js` | Created — IIFE exposing `window.SupplierCommissionAPI.fetchReport(params)` |
| `supplier-commission.css` | Replaced placeholder — full page-specific CSS (filter panel, chart card, table, error, loading, empty states) |
| `supplier-commission.js` | Replaced placeholder — full page orchestration |
| `supplier-commission.html` | Modified — added Chart.js CDN in `<head>` after `menu-component.js`; added `supplier-commission-api.js` script before `supplier-commission.js` at end of body |

## Endpoints Called

| Endpoint | Purpose |
|---|---|
| `GET /api/reports/supplier-performance?{params}` | Main report data |
| `GET /api/countries` | Country filter (via SharedFilterService) |
| `GET /api/teams` | Team filter (via SharedFilterService) |
| `GET /api/job-positions` | Job position filter (via SharedFilterService, client-side filtered) |
| `GET /api/users` | User filter (via SharedFilterService, client-side filtered) |

Query params sent to supplier-performance: `year`, `quarter`, `month`, `country_id`, `job_position`, `team_number`, `user_id` (all optional).

## Chart Type & Config

- **Type:** grouped bar (Chart.js `type: 'bar'`)
- **Data:** top 10 suppliers by `total_commission` (as loaded/sorted)
- **Datasets:** "Total Commission" (blue #3B82F6) and "Net Commission" (green #10B981)
- **X axis:** truncated `supplier_name_th` (max 15 chars), rotated 30–45 deg
- **Y axis:** formatted as `฿{Thai number}`
- **Tooltip:** shows full supplier name + both values formatted with `SharedUtils.formatCurrency`
- **Chart.js version:** latest via CDN `https://cdn.jsdelivr.net/npm/chart.js`

## Table Columns & Sort Keys

| Column | Sort Key | Align |
|---|---|---|
| Supplier Name (TH + EN sub-text) | — (not sortable) | left |
| Total Comm. | `total_commission` | right |
| Net Comm. | `total_net_commission` | right |
| จำนวนผู้เดินทาง | `total_pax` | center |
| Avg Comm.(ต่อคน) | `avg_commission_per_pax` | right |
| Avg Net(สุทธิต่อคน) | `avg_net_commission_per_pax` | right |

Sort toggles asc/desc; clicking a new column resets to desc. Default sort on load: `total_commission` desc.

## Deviations from fe-2-project

1. **No auto-fetch on filter change** — Added explicit "แสดงผล" (Apply) button consistent with other vanilla pages. The React version auto-fetches on every state change, which in vanilla JS would cause excessive API calls.
2. **Filter cascade uses SharedFilterService** — `getJobPositions` and `getUsers` are re-fetched with cascade params when team/job-position changes (matches fe-2 intent).
3. **Chart library** — Recharts (React) replaced with Chart.js (vanilla). Chart type matches: grouped bar.
4. **Page renders immediately** — filter panel visible on load; data fetched once on init with default filters (current quarter/year).

## Manual Verification Steps

1. Open `/supplier-commission` in browser (ensure auth token is set).
2. Confirm filter panel shows: รูปแบบรายงาน, ไตรมาส, ประเทศ, ทีม, ตำแหน่งงาน, ผู้ใช้, แสดงผล button.
3. Changing mode to "รายเดือน" should show เดือน + ปี selects; "รายปี" shows ปี only; "ทั้งหมด" hides period selects.
4. Change ทีม → ตำแหน่งงาน and ผู้ใช้ dropdowns should refresh (cascade).
5. Click แสดงผล → loading spinner appears, then chart + table render.
6. Click a sortable column header → rows re-sort; click same column → direction toggles; active header button turns blue.
7. Click "Export CSV" → downloads file with UTF-8 BOM, Thai supplier names visible in Excel.
8. With network off or invalid token → error banner shows message, page does not crash.
9. With filters that return no data → empty state message shown.
10. Verify no regressions on other pages (sidebar, sales-by-country, wholesale-destinations).
