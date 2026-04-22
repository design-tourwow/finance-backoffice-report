---
status: 'complete'
lastSaved: '2026-04-22'
author: 'Murat'
---

# NFR Audit Report — finance-backoffice-report

Assessment of the 10 documented NFRs with current state, test coverage,
and recommendations. Focused on production readiness before scaling user base.

## Security NFRs

### NFR1 — Token cleaned from URL after capture
- **Current:** ✅ `shared-auth-guard.js` calls `history.replaceState` immediately after reading `?token=`.
- **Test:** E2 asserts `window.location.href` does not contain `token=` after load.
- **Residual risk:** None material.
- **Recommendation:** No action.

### NFR2 — HTTPS only
- **Current:** ✅ Vercel platform enforces HTTPS (HSTS + redirect).
- **Test:** Not code-level. Platform-verifiable.
- **Residual risk:** None.
- **Recommendation:** No action.

### NFR3 — Token in Authorization header, not API URL
- **Current:** ✅ `SharedHttp.get` and `*-api.js` modules inject `Authorization: Bearer <jwt>`. No code paths append token to URL.
- **Test:** A1 asserts header injection; no URL-based token test (would be brittle — enforced by code review).
- **Residual risk:** Low. Code review catches URL-token regression.
- **Recommendation:** Add a lint rule or grep-based CI check: `grep -r "?token=" *.js *-api.js` should return 0 matches in source.

### NFR4 — No sensitive data beyond JWT in client storage
- **Current:** ✅ Only `authToken` (JWT) + `sidebar-collapsed` (UI preference) written.
- **Test:** ⚠️ No automated test.
- **Residual risk:** Medium — future devs may silently add new `localStorage.setItem(...)` for other data.
- **Recommendation:** Add an E2E assertion: after navigating every page, the storage keys must be a subset of a small allowlist. 1-hour effort.

## Reliability NFRs

### NFR5 — API failure never crashes / blanks page
- **Current:** ✅ 3-tier error pattern: filter-service returns `[]` (never throws); page APIs throw readable errors; orchestrator catches + renders inline banner.
- **Test:** E4 (×4 pages) verifies banner appears on mocked 500; C2 verifies ARIA `role="alert"`; A3/A4 verify throw.
- **Residual risk:** Low. Coverage is thorough.
- **Recommendation:** Consider adding a generic `window.onerror` handler that logs unhandled errors — currently console-only. Could be a future Sentry integration point.

### NFR6 — Zero regression on 5 existing pages
- **Current:** ✅ `menu-component.js` was the only cross-cutting edit; each modification was additive (add Dashboard to `MENU_ITEMS`, add 2 new submenus).
- **Test:** E12 (×5 pages) asserts no console errors + menu visible + content area renders.
- **Residual risk:** Low with E12 in P0 gate.
- **Recommendation:** Consider adding visual regression screenshots (Playwright built-in) for the 5 legacy pages. Prevents subtle CSS regressions.

## Integration NFRs

### NFR7 — API contract unchanged from fe-2-project
- **Current:** ✅ `be-2-report` backend endpoints and response shapes preserved — no backend modifications made by this initiative.
- **Test:** ⚠️ Not enforceable from our repo (backend is external). Contract tests (Pact) would require backend cooperation.
- **Residual risk:** Medium — if the external `be-2-report` team makes breaking changes without notice, our pages will fail.
- **Recommendation:**
  1. Subscribe to/monitor `be-2-report` deployment notifications.
  2. Add a weekly "real backend" opt-in E2E suite (currently planned — execute on schedule).
  3. Consider introducing Pact contract tests if fe-2 retirement extends in time.

### NFR8 — Authorization header format matches backend expectation
- **Current:** ✅ `Bearer <jwt>` — matches both `be-2-report` and `finance-backoffice-report-api`.
- **Test:** A1 asserts exact format.
- **Residual risk:** None.
- **Recommendation:** No action.

## Maintainability NFRs

### NFR9 — 3-file-per-page pattern (.html + .js + .css)
- **Current:** ✅ All 10 pages conform. Shared fe2-* libs are additional, consistent with stated architecture.
- **Test:** ⚠️ Not automated — architectural convention.
- **Residual risk:** Low. Code review enforces.
- **Recommendation:** Add to PR template reminder. Optional: a simple check script that verifies every `/<path>` route in `server.js` has corresponding `<path>.{html,js,css}` files.

### NFR10 — No bundler, transpiler, build tool
- **Current:** ✅ Production pages run directly in browser; no build step. `package.json` + Playwright are DEV-ONLY (CI/test) — don't ship to users.
- **Test:** ⚠️ Not automated.
- **Residual risk:** Low. Enforced by absence of build scripts in `package.json`.
- **Recommendation:** Keep `package.json` `scripts` section strictly to `dev`/`test:*` commands. Forbid adding `build`/`bundle`/`webpack`/`vite` scripts without an architectural review.

## Not in PRD but Worth Considering (Phase 2)

### Observability
- **Current:** `console.*` only. No error tracking, uptime monitoring, or user analytics.
- **Impact:** Production bugs are discovered via user complaints only.
- **Recommendation:** Integrate Sentry (10-min setup). Frontend SDK is `<script>`-compatible; doesn't violate NFR10.

### Content Security Policy
- **Current:** No CSP headers in `vercel.json`.
- **Impact:** If an XSS is introduced in future, JWT stored in storage could be exfiltrated.
- **Recommendation:** Add a restrictive CSP to `vercel.json`:
  ```json
  "headers": [{
    "source": "/(.*)",
    "headers": [{ "key": "Content-Security-Policy",
      "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://be-2-report.vercel.app https://*-finance-backoffice-report-api.vercel.app https://finance-backoffice-report-api.vercel.app" }]
  }]
  ```

### Chart.js Version Pinning
- **Current:** `https://cdn.jsdelivr.net/npm/chart.js` = "latest" → silent breaking change risk.
- **Recommendation:** Pin to `chart.js@4.4`: `https://cdn.jsdelivr.net/npm/chart.js@4.4/dist/chart.umd.min.js`. 5-minute change across 3 HTML files.

### Rate Limiting / Slow Backend Handling
- **Current:** No timeout or user-visible countdown on slow responses.
- **Test:** E14 partially addresses via slow-mock.
- **Recommendation:** Set `SharedHttp.get` timeout to 30s with a clear user-facing "Request timed out" error.

## Overall NFR Verdict

| Category | Pass | Partial | Action Needed |
|---|---|---|---|
| Security (NFR1-4) | 3 | 1 (NFR4) | Add storage-allowlist test (~1h) |
| Reliability (NFR5-6) | 2 | 0 | None urgent |
| Integration (NFR7-8) | 1 | 1 (NFR7) | Weekly real-backend smoke + contract tests (future) |
| Maintainability (NFR9-10) | 2 | 0 | Document in PR template |

**Production readiness:** ✅ ACCEPTABLE for internal-finance-team scale. Flag
Phase-2 items (Sentry, CSP, Chart.js pin) before expanding user base or making
system externally available.
