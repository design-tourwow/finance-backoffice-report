---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01', 'step-02', 'step-03', 'step-04', 'step-05']
workflowType: 'testarch-test-design'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - skills/test-artifacts/test-design-architecture.md
lastSaved: '2026-04-21'
---

# Test Design for QA: finance-backoffice-report

**Purpose:** Concrete test scenarios, priorities, and execution plan for QA team to implement. Sibling to `test-design-architecture.md` (architectural concerns).

**Date:** 2026-04-21
**Author:** Murat (Master Test Architect)
**Project:** finance-backoffice-report
**Target Framework:** Playwright (dev-dep, no production bundle impact)

---

## Scope

**Routes under test (10):**

| Group | Routes |
|---|---|
| Existing pages (5) | `/tour-image-manager`, `/sales-by-country`, `/wholesale-destinations`, `/commission-report-plus`, `/work-list` |
| fe-2 ported pages (4) | `/supplier-commission`, `/discount-sales`, `/order-external-summary`, `/request-discount` |
| New fe-2 landing (1) | `/dashboard` |

**Shared libraries under test (6 + 3 legacy):**

| Library | Window global |
|---|---|
| `shared-ui.js` | `SharedUI` |
| `shared-chart.js` | `SharedChart` |
| `shared-table.js` | `SharedTable` |
| `shared-csv.js` | `SharedCSV` |
| `shared-filter-panel.js` | `SharedFilterPanel` |
| `shared-http.js` | `SharedHttp` |
| `shared-utils.js` | `SharedUtils` |
| `shared-filter-service.js` | `SharedFilterService` |
| `token-utils.js` | `TokenUtils` |

**API modules under test (4):**
- `supplier-commission-api.js`, `discount-sales-api.js`, `order-external-summary-api.js`, `request-discount-api.js`

---

## Risk Matrix (summarized from architecture.md)

### 🔴 Critical (score 9)
- **R1** — 4 pages refactor regression (~-1,300 lines removed). Covers: E1, E4, E6, E8, E12

### 🟠 High (score 6)
- **R3** — `SharedHttp` 401 redirect loop. Covers: A2
- **R9** — Existing pages regress from `menu-component.js` change. Covers: E12
- **R11** — No staging `be-2-report` → test pollutes prod. Mitigation: mock all backend calls
- **R13** — No E2E tests → prod-discovered bugs. Mitigation: entire suite

### 🟡 Medium (score 4)
- R7 (Request Discount checkbox regression), R8 (CSV Thai encoding), R10 (slow API UX), R15 (cascade race)

### 🟢 Low (score ≤3)
- R2, R4, R5, R6, R12, R14 — monitor, mitigate later

---

## Coverage Matrix — 35 Test Scenarios

### Unit Tests (9 — fast, Node-level)

| ID | Name | Target | Priority |
|---|---|---|---|
| U1 | `SharedUtils.formatCurrency` — int / negative / zero / Thai locale | `shared-utils.js` | P1 |
| U2 | `SharedUtils.formatDateTH` — Buddhist year +543 / null / invalid | `shared-utils.js` | P1 |
| U3 | `SharedUtils.sortCountriesByThai` — Thai collation order | `shared-utils.js` | P2 |
| U4 | `SharedUtils.filterAndDisplayJobPositions` — ts/crm filter | `shared-utils.js` | P2 |
| U5 | `SharedUtils.get{Year,Month,Quarter}Options` — current-year-first, labels | `shared-utils.js` | P2 |
| U6 | `SharedHttp.buildQuery` — skip undefined/null/'' + encode | `shared-http.js` | P1 |
| U7 | `SharedHttp.getAuthHeader` — with/without token | `shared-http.js` | P1 |
| U8 | `SharedCSV.export` — BOM prefix + RFC 4180 escape (comma, quote, newline) | `shared-csv.js` | P1 |
| U9 | `TokenUtils.isTokenExpired` / `decodeToken` — valid/expired/malformed | `token-utils.js` | **P0** |

### Component Tests (6 — DOM-level, happy-dom or Playwright component)

| ID | Name | Priority |
|---|---|---|
| C1 | `SharedUI.showLoading` injects spinner + `aria-live="polite"` | **P0** |
| C2 | `SharedUI.showError` injects banner + `role="alert"` + optional retry button | **P0** |
| C3 | `SharedTable.render` — columns/rows render, sortable header click fires `onSort` | P1 |
| C4 | `SharedTable.render` — sort direction indicator toggles asc/desc | P2 |
| C5 | `SharedFilterPanel.render` — dropdowns populated, cascade on team change | P1 |
| C6 | `SharedFilterPanel.render` — Apply button fires `onApply(state)` | P1 |

### API / HTTP Tests (6 — mocked `fetch`)

| ID | Name | Priority |
|---|---|---|
| A1 | `SharedHttp.get` sends `Authorization: Bearer <token>` on every request | **P0** |
| A2 | `SharedHttp.get` on 401 → `TokenUtils.redirectToLogin` called + never resolves (no loop) | **P0** |
| A3 | `SharedHttp.get` on 5xx → throws `Error(...)` with status + url | **P0** |
| A4 | `SharedHttp.get` on network error → throws | P1 |
| A5 | Each `*-api.js` fetch — correct endpoint + query params + response normalize | P1 |
| A6 | `SharedFilterService.*` → returns `[]` on error (NEVER throws) | **P0** |

### E2E Tests (15 — Playwright, mocked backend)

| ID | Name | Scope | Priority |
|---|---|---|---|
| E1 | **Smoke — all 10 routes** — HTTP 200 + no console errors + menu visible | 10 pages | **P0** |
| E2 | **JWT handoff** — `/supplier-commission?token=X` → token in storage + URL cleaned | sample page | **P0** |
| E3 | **Missing token redirect** — no token → redirect to login URL | sample page | **P0** |
| E4 | **API failure → error banner** (mock 500 response) | 4 ported pages | **P0** |
| E5 | **Menu active state** — `aria-current="page"` on current page's menu item | all pages | P1 |
| E6 | **Filter Apply triggers API + render** (chart + table) | 4 ported pages | P1 |
| E7 | **Filter cascade** — team change → jobPos + user dropdowns refresh | sample page | P1 |
| E8 | **Sortable table** — click header → rows re-order asc/desc | 3 pages with table | P1 |
| E9 | **Request Discount — checkbox = 0 API calls** (Story 6.3 AC) | request-discount | P1 |
| E10 | **Dashboard cards navigate** — click card → URL matches | dashboard | P2 |
| E11 | **CSV export download** + verify BOM bytes + Thai chars in output | 4 ported pages | P2 |
| E12 | **Existing-pages regression** — open each → content renders (visual snapshot) | 5 existing pages | **P0** |
| E13 | **Chart renders with mocked data** — Chart.js canvas present, data points match | 3 chart pages | P2 |
| E14 | **Slow API UX** — mock 10s delay → loading visible; abort gracefully after timeout | 1 page | P2 |
| E15 | **Mobile viewport** — sidebar toggle works, filter panel usable at 375px | 2 pages | P3 |

---

## Priority Distribution

| Priority | Count | % | Gate |
|---|---|---|---|
| **P0 (blocking)** | 11 | 31% | Must pass 100% before deploy |
| **P1 (critical)** | 13 | 37% | Pass ≥ 95% |
| **P2 (secondary)** | 10 | 29% | Pass ≥ 85% (warn) |
| **P3 (nice)** | 1 | 3% | Optional |

---

## Execution Strategy

### PR Gate (fast — < 5 min)
- All **Unit (9)** + **Component (6)** + **API (6)** — 21 tests total
- **P0 E2E smoke** only: E1 (10 routes), E4 (4 pages API-failure), E12 (5 existing pages snapshot)
- Parallel across 4 workers

### Nightly (main branch — < 20 min)
- Full E2E suite (all P0 + P1 + P2)
- Visual regression on all 10 pages
- Posts summary to PR comments on next day's runs

### Weekly (scheduled — < 30 min)
- P3 (mobile viewport)
- Performance baseline (lighthouse on 4 ported pages)
- Real-backend integration opt-in smoke (3-5 tests against actual `be-2-report` prod in read-only mode) — risk-accept R4

---

## Resource Estimate

| Bucket | Scope | Range |
|---|---|---|
| Framework setup (Playwright, fixtures, CI wiring) | TF step | ~5–8 hours |
| P0 scenarios (11 tests) | Core | ~15–22 hours |
| P1 scenarios (13 tests) | Critical | ~15–25 hours |
| P2 scenarios (10 tests) | Secondary | ~10–20 hours |
| P3 scenarios (1 test) | Nice | ~2–5 hours |
| Flake triage + stabilization (expected 5%) | Ongoing | ~5–10 hours |
| **Total** | | **~52–90 hours** (~1.5–2.25 dev weeks) |

---

## Quality Gates

| Gate | Threshold | Enforcement |
|---|---|---|
| P0 pass rate | 100% | **Blocks PR merge** |
| P1 pass rate | ≥ 95% | Warn + require manual override |
| P2 pass rate | ≥ 85% | Warn-only |
| Console errors in E2E | 0 | Blocks PR merge |
| Coverage line % on `fe2-*.js` | ≥ 70% | Warn |
| Coverage line % on `*-api.js` | ≥ 60% | Warn |
| Flaky test rate | < 2% over 20 runs | Investigate + quarantine |
| All 5 high-risks (R1, R3, R9, R11, R13) covered by P0/P1 tests | yes | **Verified at test review** |

---

## Risk Mitigation Map

| Risk | Score | Mitigated by |
|---|---|---|
| R1 — 4 pages refactor regression | 9 | E1, E4, E6, E8, E12 (P0/P1) |
| R3 — 401 redirect loop | 6 | A2 (P0) |
| R9 — Existing pages regress | 6 | E12 (P0) |
| R11 — Prod pollution | 6 | All tests use `page.route()` mocks |
| R13 — No E2E | 6 | Entire E1-E15 suite |
| R7 — Checkbox API-call regress | 4 | E9 (P1) |
| R8 — CSV encoding | 4 | U8 + E11 (P1/P2) |
| R10 — Slow API UX | 4 | E14 (P2) |
| R15 — Cascade race | 4 | C5 + E7 (P1) |

All 9 risks with score ≥4 have explicit test coverage.

---

## Deliverables Checklist

- [ ] Playwright installed as dev-dependency (use `TF` menu item next)
- [ ] `tests/fixtures/mock-backend.js` — central endpoint mock helper
- [ ] `tests/fixtures/mock-token.js` — JWT generator with configurable expiry
- [ ] `tests/unit/` — 9 unit tests
- [ ] `tests/component/` — 6 component tests
- [ ] `tests/api/` — 6 API / HTTP tests
- [ ] `tests/e2e/` — 15 E2E tests
- [ ] `playwright.config.ts` — base URL `http://localhost:8080`, retries 2, projects chromium/webkit/firefox
- [ ] GitHub Actions workflow `.github/workflows/test.yml` — PR + nightly + weekly (use `CI` menu item)
- [ ] `tests/README.md` — how to run, fixture conventions

---

## Next Actions

1. **Sign off `test-design-architecture.md`** — get Eng/Architect/DevOps buy-in
2. **Invoke `TF` (Test Framework)** from Murat menu — initialize Playwright
3. **Invoke `TA` (Test Automation)** — generate P0 + P1 tests
4. **Invoke `CI`** — wire PR gate
5. **Manual P0 smoke first** if time-constrained before automated setup (use existing `curl` + browser)

---

## Open Questions

1. Budget: do we have 1 dedicated QA for 2 weeks, or QA+Dev split?
2. CI provider: GitHub Actions (recommended — Vercel-friendly) or other?
3. Real-backend integration suite: opt-in weekly or skip entirely until fe-2 retirement complete?
4. Visual regression tool: Playwright built-in or Percy/Chromatic?

**Recommended defaults if user silent:** GitHub Actions + opt-in weekly integration + Playwright built-in visual.
