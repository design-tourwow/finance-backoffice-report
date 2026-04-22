# Epic 2 Story 2.1 — Unified Navigation Menu

## Files Modified

- `/Users/gap/finance-backoffice-report/menu-component.js`

## HTML Shells Verified (no changes needed)

All 4 shells confirmed to have:
- `<script src="menu-component.js"></script>`
- `<nav class="nav-menu">` (sidebar target)
- `<ul class="navbar-list">` (header navbar target)

Files checked:
- `supplier-commission.html`
- `discount-sales.html`
- `order-external-summary.html`
- `request-discount.html`

## Diff Summary

Added 4 items to the `Report` submenu array in `MENU_ITEMS` (after `commission-report-plus`):

```js
{ id: 'supplier-commission',    label: 'Supplier Commission',    url: '/supplier-commission',    requireAuth: true },
{ id: 'discount-sales',         label: 'Discount Sales',         url: '/discount-sales',         requireAuth: true },
{ id: 'order-external-summary', label: 'Order External Summary', url: '/order-external-summary', requireAuth: true },
{ id: 'request-discount',       label: 'Request Discount',       url: '/request-discount',       requireAuth: true }
```

No changes to `renderSidebarMenu`, `renderHeaderMenu`, or any other logic.

## How to Verify

1. Open any existing page (e.g. `/sales-by-country`) — Report submenu should now list 8 items, not 4.
2. Navigate to `/supplier-commission` — "Supplier Commission" item shows active/highlighted state in both sidebar and header.
3. Navigate to `/request-discount` — "Request Discount" item shows active state.
4. Existing items (work-list, sales-by-country, wholesale-destinations, commission-report-plus) unchanged — NFR6 zero regression.
