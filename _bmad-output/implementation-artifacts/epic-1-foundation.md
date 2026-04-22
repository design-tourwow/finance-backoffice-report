# Epic 1 Foundation — Implementation Record

## Stories completed

| Story | Status |
|-------|--------|
| 1.1   | Pre-existing (routes + HTML shells) |
| 1.2   | Done |
| 1.3   | Done |
| 1.4   | Done |

---

## Files created

| File | Purpose |
|------|---------|
| `shared-utils.js` | Shared utility functions — `window.SharedUtils` |
| `shared-filter-service.js` | Filter API service — `window.SharedFilterService` |
| `shared-auth-guard.js` | Self-running auth guard IIFE |

## Files modified

| File | Change |
|------|--------|
| `supplier-commission.html` | Added 3 script tags after token-utils.js |
| `discount-sales.html` | Added 3 script tags after token-utils.js |
| `order-external-summary.html` | Added 3 script tags after token-utils.js |
| `request-discount.html` | Added 3 script tags after token-utils.js |

Script load order in each HTML (unchanged from story 1.1 except additions):

```
token-utils.js          ← already present
shared-auth-guard.js       ← new, runs immediately
shared-utils.js            ← new, attaches SharedUtils
shared-filter-service.js   ← new, attaches SharedFilterService
menu-component.js       ← already present
... page-specific JS    ← already present
```

---

## Key decisions / deviations

### Story 1.2

- `formatDateTH` was NOT in `dateUtils.ts`; it was an inline helper in `OrderExternalSummary.tsx` — copied verbatim.
- `filterAndDisplayJobPositions` in fe-2 accepts NO `teamId` parameter (it only filters ts/crm types). Story 1.2 asks for `teamId` support — implemented as optional second arg that further filters by `team_number` when provided. This is additive and does not break the zero-arg call pattern used in fe-2.
- `getYearOptions` in fe-2 returns `number[]`. Story says "returns array of year objects" — kept as `number[]` to match actual fe-2 output; page code can format labels itself.

### Story 1.3

- `getCountries` is in `supplierApi.ts` in fe-2, not `filterService.ts`. Story 1.3 specifies it in `SharedFilterService` — included it there (same endpoint `/api/countries`, same normalise logic). Page code can use a single service.
- Client-side filtering for `getJobPositions(teamId)` and `getUsers(teamId, jobPositionId)` mirrors `getUsersFiltered` in fe-2; no separate query-param filtering because fe-2 API does not accept filter params on those endpoints.
- Never throws — all public methods catch and return `[]`.

### Story 1.4

- Token saved to BOTH `sessionStorage` AND `localStorage` so `TokenUtils.getToken()` (which checks sessionStorage first) finds it.
- `history.replaceState` used to strip `?token` from URL — no page reload.
- Guard calls `TokenUtils.redirectToLogin(message)` which already calls `clearToken()` internally — no duplicate clear needed.

---

## AC verification

### Story 1.2 ACs
- `SharedUtils.formatCurrency(1234567)` → Thai-locale integer string.
- `SharedUtils.formatDateTH('2024-04-01')` → `'01/04/2567'`.
- `SharedUtils.getYearOptions()` → array of 5 integers, first = current year.
- `SharedUtils.getMonthOptions()` → 12 objects with `value` and Thai `label`.
- `SharedUtils.getQuarterOptions()` → 4 objects, first labelled `Qn/yyyy (Current)`.
- `SharedUtils.sortCountriesByThai([...])` → sorted copy, Thai locale.
- `SharedUtils.filterAndDisplayJobPositions([...])` → only ts/crm items with `display_name`.

### Story 1.3 ACs
- Open browser DevTools on any of the 4 pages (with valid token in storage).
- `SharedFilterService.getCountries()` resolves to array (or `[]` on error).
- `SharedFilterService.getTeams()` resolves to array.
- `SharedFilterService.getJobPositions()` resolves to array.
- `SharedFilterService.getUsers()` resolves to array.
- Remove token, call any method → 401 triggers `TokenUtils.redirectToLogin`.
- Network failure → returns `[]`, no thrown exception.

### Story 1.4 ACs
- Navigate to `/supplier-commission?token=<jwt>` → token stored in sessionStorage + localStorage, URL cleaned to `/supplier-commission`.
- Navigate to `/supplier-commission` with no token anywhere → redirected to login URL.
- Navigate to `/supplier-commission` with token already in storage → page loads normally.
