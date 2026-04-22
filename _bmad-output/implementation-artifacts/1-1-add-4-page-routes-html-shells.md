---
story: 1.1
title: Add 4 Page Routes & HTML Shells
status: complete
epic: 1
---

# Story 1.1: Add 4 Page Routes & HTML Shells

## Story

As a developer,
I want 4 new page routes registered and HTML shell files created,
So that the new pages are accessible via URL and ready for content.

## Acceptance Criteria

**Given** server.js is loaded
**When** a request arrives at /supplier-commission, /discount-sales, /order-external-summary, or /request-discount
**Then** each request is served the correct .html file without 404

**Given** vercel.json is updated
**When** Vercel serves the app in production
**Then** all 4 new routes resolve correctly

**Given** each HTML shell file exists
**When** the page loads in browser
**Then** the page renders the shared menu, a page title, and an empty content area without console errors

## Tasks

- [x] Task 1: Add 4 routes to server.js
- [x] Task 2: Add 4 rewrites to vercel.json
- [x] Task 3: Create supplier-commission.html shell
- [x] Task 4: Create discount-sales.html shell
- [x] Task 5: Create order-external-summary.html shell
- [x] Task 6: Create request-discount.html shell
- [x] Task 7: Create placeholder CSS files (4)
- [x] Task 8: Create placeholder JS files (4)

## Dev Agent Record

### Implementation Notes

- API base URL for fe-2 pages: https://be-2-report.vercel.app (hardcoded in page-specific JS, not env config)
- fe-2-project auth token key: `jwt_token` in localStorage
- finance-backoffice-report auth token key: `authToken` in sessionStorage/localStorage
- New pages use `authToken` convention (consistent with this project's token-utils.js)
- Authorization header format: `Bearer ${token}` (matches be-2-report.vercel.app expectation)

## File List

- server.js
- vercel.json
- supplier-commission.html
- discount-sales.html
- order-external-summary.html
- request-discount.html
- supplier-commission.css
- discount-sales.css
- order-external-summary.css
- request-discount.css
- supplier-commission.js
- discount-sales.js
- order-external-summary.js
- request-discount.js
