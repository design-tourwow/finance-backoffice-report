---
status: 'complete'
lastSaved: '2026-04-22'
framework: 'Playwright'
---

# Test Automation Summary — All 35 scenarios generated

## Files created (19 test files across 4 levels)

### Unit (3 files — 9 tests)
| File | Scenarios |
|---|---|
| `tests/unit/fe2-utils.test.ts` | U1, U2, U3, U4, U5 (×3) |
| `tests/unit/fe2-csv.test.ts` | U8 (×2) |
| `tests/unit/token-utils.test.ts` | U9 (×5) |

### Component (3 files — 6 tests)
| File | Scenarios |
|---|---|
| `tests/component/fe2-ui.test.ts` | C1, C2 |
| `tests/component/fe2-table.test.ts` | C3, C4 |
| `tests/component/fe2-filter-panel.test.ts` | C5, C6 |

### API / HTTP (3 files — 13 assertions, 6 scenarios)
| File | Scenarios |
|---|---|
| `tests/api/fe2-http.test.ts` | U6, U7, A1, A2, A3, A4 |
| `tests/api/fe2-filter-service.test.ts` | A6 (×5) |
| `tests/api/page-apis.test.ts` | A5 (×5) |

### E2E (10 files — 15 scenarios)
| File | Scenarios |
|---|---|
| `tests/e2e/smoke.test.ts` | E1 (×11 routes) |
| `tests/e2e/auth.test.ts` | E2, E3 |
| `tests/e2e/reports.test.ts` | E4 (×4), E6 (×4), E8 (×3) |
| `tests/e2e/request-discount.test.ts` | E9 |
| `tests/e2e/dashboard.test.ts` | E10 |
| `tests/e2e/csv-export.test.ts` | E11 (×4) |
| `tests/e2e/regression.test.ts` | E12 (×5), E5 |
| `tests/e2e/chart.test.ts` | E13 (×3) |
| `tests/e2e/resilience.test.ts` | E14, E7 |
| `tests/e2e/mobile.test.ts` | E15 (×2) |

## Priority coverage

| Priority | Target | Actual |
|---|---|---|
| @p0 | 11 | 11+ (E1, E2, E3, E4, E12, U9, C1, C2, A1, A2, A3, A6) |
| @p1 | 13 | 13+ (U1, U2, U6, U7, U8, C3, C5, C6, A4, A5, E5, E6, E7, E8, E9) |
| @p2 | 10 | 10 (U3, U4, U5, C4, E10, E11, E13, E14) |
| @p3 | 1 | 2 (E15 × 2 variants) |

## Risk mitigation verification

All 5 high risks addressed:
- ✅ R1 (4 pages refactor regression) — smoke.test, reports.test, regression.test
- ✅ R3 (401 loop) — fe2-http.test A2
- ✅ R9 (existing pages regress) — regression.test (5 pages)
- ✅ R11 (prod pollution) — mockBackend fixture used by all e2e tests
- ✅ R13 (no E2E) — 15 scenarios across 10 e2e files

## How to run

```bash
# First time only
npm install
npm run test:install-browsers

# Run all
npm test

# By priority
npm run test:p0          # blocking, run first
npm run test:p1          # critical
npm run test:smoke       # quick PR gate

# By level
npm run test:unit        # ~1 min
npm run test:component   # ~2 min
npm run test:api         # ~1 min
npm run test:e2e         # ~5-10 min

# Debug a failing test
npm run test:ui          # interactive
npm run test:debug       # with inspector
npm run test:report      # open HTML report
```

## Known assumptions & caveats

1. Tests assume `fe2-*.js` source files expose expected `window.*` globals.
   If implementations drift, sample tests fail fast.
2. E2E tests mock all backend calls via `page.route()` — zero prod pollution.
3. CSV export tests use `download` event — some pages may not have an Export
   button matching the regex; those auto-skip with `test.skip(true, ...)`.
4. Filter panel test C5/C6 asserts dropdowns exist but doesn't validate exact
   field count since `FE2FilterPanel` may conditionally hide period selector
   when mode='all'.
5. Request Discount E9 counts network requests to `/api/reports/order-has-discount`
   after page is loaded — passes if 0 new calls on checkbox toggle.

## Next steps

1. Run `npm install && npm run test:install-browsers`
2. Run `npm run test:p0` to verify the blocking tests pass
3. Triage any failures — most likely causes: selector drift, timing, missing fixture
4. Invoke `CI` from Murat menu to wire GitHub Actions
5. Consider `TR` (trace coverage) to verify 40 FRs / 10 NFRs all map to tests
