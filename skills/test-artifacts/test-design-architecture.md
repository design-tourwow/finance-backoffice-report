---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01', 'step-02', 'step-03', 'step-04', 'step-05']
workflowType: 'testarch-test-design'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/project-context.md
lastSaved: '2026-04-21'
---

# Test Design for Architecture: finance-backoffice-report (fe-2 Unification)

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for Dev/Architect review. Contract between QA and Engineering on what must be addressed before test development begins.

**Date:** 2026-04-21
**Author:** Murat (Master Test Architect)
**Status:** Architecture Review Pending
**Project:** finance-backoffice-report
**PRD Reference:** `_bmad-output/planning-artifacts/prd.md`
**Architecture Reference:** `_bmad-output/planning-artifacts/architecture.md`

---

## Executive Summary

**Scope:** System-level test design covering 10 routes (5 existing + 4 fe-2-ported + Dashboard), 6 shared fe-2 libraries, dual-backend integration, JWT-based auth, and menu/shell cross-cutting concerns. Post-implementation brownfield state.

**Architecture** (from architecture.md):
- **MPA** over SPA — each page is its own HTML; no client-side routing
- **Vanilla JS + HTML5 + CSS3** — no bundler, transpiler, or build tool (NFR10 hard constraint)
- **JWT Bearer auth** — URL capture → `sessionStorage + localStorage` → header injection
- **Two parallel backends**: `be-2-report.vercel.app` (4 ported pages) + `finance-backoffice-report-api.vercel.app` (existing pages)
- **Shared via `window.*` globals**: `TokenUtils`, `SharedUtils`, `SharedFilterService`, `SharedUI`, `SharedChart`, `SharedTable`, `SharedCSV`, `SharedFilterPanel`, `SharedHttp`

**Expected Scale:** Internal tool; Finance team ~10-30 users; desktop-first (Chrome/Edge/Safari latest)

**Risk Summary:**
- **Total risks identified:** 15
- **High-priority (≥6):** 5 risks requiring mitigation before next release
- **Test effort:** ~35 scenarios (~52–85 hours, ~1.5–2 dev weeks for 1 QA)

---

## Architecturally Significant Requirements (ASRs)

### ACTIONABLE (must address before test dev)

**ASR1 — API failure must never blank page (NFR5)**
- Impact: User sees blank → thinks system broken → reports bug
- Test coverage: C1/C2 (SharedUI banners) + A3/A4 (SharedHttp throws) + E4 (E2E mock 500)
- Owner: Dev already addressed via 3-tier error pattern; QA verifies

**ASR2 — Zero regression on 5 existing pages (NFR6)**
- Impact: menu-component.js edit may break sidebar/topbar on legacy pages
- Test coverage: E1 (smoke all routes) + E12 (regression snapshots)
- Owner: QA owns; Dev provides snapshot baselines

**ASR3 — JWT lifecycle security (NFR1-4)**
- Impact: Token leak in URL history = session theft risk
- Test coverage: U9 (token validate) + A1 (Bearer injection) + A2 (401 redirect) + E2 (handoff) + E3 (missing token)
- Owner: Dev ✅ implemented; QA verifies no drift

### FYI (not directly testable from our repo)

**ASR4 — API contract unchanged from fe-2 (NFR7-8):** out of scope — `be-2-report` backend owned elsewhere. Recommend: add Pact contract tests if retire plan extends.

**ASR5 — No build tool (NFR10):** constrains framework choice. Playwright acceptable (dev-dep).

---

## Testability Assessment

### 🚨 Concerns (must address)

| ID | Concern | Severity | Recommended Action |
|---|---|---|---|
| T1 | No test framework | 🔴 Blocker | Install Playwright as dev-dep (TF step in menu) |
| T2 | `be-2-report` has no staging | 🟠 High | **Mock all backend calls in tests** via `page.route()`; flag as P2 for real staging env |
| T3 | JWT tokens tied to real Finance Backoffice | 🟡 Med | Use mock tokens (any JWT-shaped string works for client-side `decodeToken`) |
| T4 | No Sentry / error tracking in prod | 🟠 High | P2 deferred per architecture.md; acceptable for now but add before scaling |
| T5 | Shared backend state → concurrent tests interfere | 🟡 Med | Isolate via Playwright browser contexts (already per-test default) |
| T6 | No fixtures / factories | 🟢 Low | Build minimal `mockBackend()` helper during Phase 1 setup |

### ✅ Strengths (leverage these)

| ID | Strength |
|---|---|
| S1 | `window.*` global namespace → mock via `page.addInitScript(() => { window.SharedHttp = stub })` |
| S2 | `node server.js` static serve → no build, fast test startup |
| S3 | MPA → deep-link tests directly; no `beforeEach(navigate)` chains |
| S4 | Deterministic DOM from Chart.js/table/filter-panel → selector-based assertions reliable |
| S5 | Visible Thai error banners → manual + automated both viable |

---

## Integration Points (Test-Relevant)

| Integration | Type | Test Strategy |
|---|---|---|
| `be-2-report.vercel.app` | Outbound REST + Bearer | **Mock via `page.route()`**; never hit prod in CI |
| `finance-backoffice-report-api.vercel.app` | Outbound REST + Bearer | Mock for existing-page tests |
| Finance Backoffice (JWT issuer) | Inbound `?token=` | Simulate with mock JWT in URL |
| `fonts.googleapis.com` (Kanit) | CDN CSS | Accept; allow external in test |
| `cdn.jsdelivr.net/npm/chart.js` | CDN JS | Accept; if offline test needed, serve local copy |

---

## NFR Compliance Matrix

| NFR | Requirement | Test Owner | Priority |
|---|---|---|---|
| NFR1 | JWT cleaned from URL | E2 | P0 |
| NFR2 | HTTPS only | Platform (Vercel) | FYI |
| NFR3 | Token in header, not URL | A1 | P0 |
| NFR4 | No sensitive data beyond JWT in storage | Manual audit | P1 |
| NFR5 | API failure → error, not blank | E4, C2, A3, A4 | P0 |
| NFR6 | Zero regression existing pages | E1, E12 | P0 |
| NFR7 | API contract unchanged | (FYI — contract tests future) | — |
| NFR8 | Authorization header format `Bearer <jwt>` | A1 | P0 |
| NFR9 | 3-file-per-page pattern | Lint / manual | FYI |
| NFR10 | No build tool | Manual review | FYI |

---

## Architectural Recommendations for Test Development

1. **Mock-first strategy** — every test mocks backend via Playwright `page.route()`. Real-backend integration is a separate opt-in suite (P3 / weekly).
2. **Single source of mocks** — create `tests/fixtures/mock-backend.js` exporting helper to stub all `be-2-report` + `finance-backoffice-report-api` endpoints with fixture data.
3. **Auth fixture** — `tests/fixtures/mock-token.js` that generates a JWT-shaped string with configurable `exp` claim.
4. **Regression-first smoke** — P0 E2E suite runs in PR gate; full suite nightly.
5. **Isolate `menu-component.js` tests** — since it's cross-cutting, its changes should trigger full E2E regression (E1 + E12).
6. **No real-backend CI** — mitigates R11 (prod pollution) completely.

---

## Handoff Contract

| Engineering / Architecture owes QA | QA owes Engineering / Architecture |
|---|---|
| Stable `window.*` API surfaces (no breaking renames without coordination) | Baseline snapshots for E12 regression tests |
| Mock-friendly request patterns (no `fetch` calls outside `SharedHttp`) | Mocked fixture data matching production response shapes |
| Fixed Chart.js version in CDN script (pin to 4.4.x) — R14 mitigation | Flaky test triage (<2% rate) |
| Mock endpoint list updated when new backend dependency added | Test report per PR with P0 pass rate + coverage % |

---

## Open Questions / Assumptions

1. **Are Chart.js + jsDelivr CDN reliable enough for CI?** Assumption: yes (97%+ uptime). If flaky, serve local copy.
2. **Can tests run headless on Vercel CI?** Yes — Playwright has GitHub Actions integration; repo currently has no CI pipeline though (see `CI` menu item).
3. **JWT expiry window for tests?** Assumption: 24h from test start. Generate fresh token per test file via fixture.
4. **Real-backend smoke tests weekly — opt-in or default?** Recommend opt-in (`pnpm test:integration`) so unreliable prod doesn't block PRs.

---

## Sign-off Required

- [ ] Engineering lead confirms ASRs 1-3 actionable and will not be refactored away
- [ ] Architect confirms `window.*` global surface stable for test mocking
- [ ] DevOps confirms staging `be-2-report` not available; all tests mock-based acceptable
- [ ] PM confirms P0 + P1 test scope fits within 2-week dev budget

When signed off, QA proceeds to `test-design-qa.md` for scenario implementation.
