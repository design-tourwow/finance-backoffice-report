# Epic 5 — Order External Summary Implementation

## Files Changed

| File | Action |
|------|--------|
| `order-external-summary-api.js` | NEW — IIFE, exposes `window.OrderExternalAPI.fetch(filters)` |
| `order-external-summary.css` | REPLACED placeholder — full page CSS |
| `order-external-summary.js` | REPLACED placeholder — full page logic |
| `order-external-summary.html` | MODIFIED — added `<script src="order-external-summary-api.js">` before main JS |

## Endpoint

`GET https://be-2-report.vercel.app/api/reports/order-external-summary`

Query params: `year`, `month`, `country_id`, `job_position`, `team_number`, `user_id`

## Table Columns (8)

1. รหัส Order (`order_code`)
2. วันที่สร้าง Order (`created_at` → `SharedUtils.formatDateTH`)
3. ชื่อลูกค้า (`customer_name`)
4. ยอดสุทธิ (`net_amount`)
5. ค่าคอมมิชชั่น (`supplier_commission`)
6. ส่วนลด (`discount`)
7. วันที่ชำระเงิน (`paid_at` → `SharedUtils.formatDateTH`)
8. เซลล์ที่ทำ Order (`seller_nickname`)

## Summary Cards (4)

- จำนวน Orders
- ยอดสุทธิรวม
- ค่าคอมมิชชั่นรวม
- ส่วนลดรวม

## Deviations from Reference

- No auto-load on filter change; uses explicit Apply button (consistent with project convention).
- Filter cascade: team → job_position → user is client-side (allUsers cached on init), matching fe-2 logic.

## Verification Steps

1. Open `/order-external-summary` (or `order-external-summary.html` locally via dev server).
2. Confirm filter panel renders with 6 dropdowns (month, year, country, job position, team, user).
3. Change Team → confirm User dropdown filters; change Job Position → confirm User filters further.
4. Click ค้นหา → summary cards and table populate.
5. Dates in table show `DD/MM/YYYY` with Buddhist year (e.g. 2568).
6. Click Export CSV → file downloads with UTF-8 BOM, correct headers and summary footer row.
7. Simulate API failure (block network) → red error banner appears, no crash.
8. With no matching data → empty state shown.
