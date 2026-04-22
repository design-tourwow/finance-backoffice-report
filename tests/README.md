# Test Suite — finance-backoffice-report

Playwright-based test suite covering unit, component, API, and E2E levels for
the vanilla-JS finance backoffice report app.

> Note: this repo follows NFR10 (no build tool). `package.json` + `node_modules`
> are scoped **exclusively to test dev-dependencies** — they do not ship to
> browsers and do not affect the production static bundle.

## Setup

```bash
# Use the pinned Node version (24)
nvm use
# (or) install Node 24+ manually

# Install Playwright and its browsers
npm install
npm run test:install-browsers

# Optional: override default env
cp .env.example .env.local
```

## Run tests

| Command | What it does |
|---|---|
| `npm test` | Run entire suite (unit + component + api + e2e) |
| `npm run test:unit` | Unit tests only (Node-level, no browser) |
| `npm run test:component` | Component tests (browser, DOM-level) |
| `npm run test:api` | API / HTTP tests (mocked fetch) |
| `npm run test:e2e` | E2E Chromium only |
| `npm run test:smoke` | All `@smoke`-tagged tests |
| `npm run test:p0` | All `@p0`-tagged tests (blocking) |
| `npm run test:p1` | All `@p1`-tagged tests (critical) |
| `npm run test:ui` | Playwright UI mode (interactive) |
| `npm run test:headed` | Run with visible browsers |
| `npm run test:debug` | Pause on first failure, inspector |
| `npm run test:report` | Open last HTML report |

## Architecture

### Directory layout

```
tests/
├── unit/                # Pure logic, fast (no browser)
├── component/           # DOM-level (browser, single page)
├── api/                 # HTTP client + -api.js modules (fetch stubs)
├── e2e/                 # Full user journeys (browser, mocked backend)
├── fixtures/
│   ├── mock-backend.ts  # Central Playwright page.route() stubs
│   └── mock-token.ts    # JWT generator
└── support/
    └── test-base.ts     # Extended Playwright `test` with fixtures + helpers
```

### Fixtures

- `mockedBackend({ countries, teams, supplierReport, ... })` — stubs every
  `be-2-report.vercel.app` + `finance-backoffice-report-api.vercel.app` call.
  Always call before `page.goto` on a page that fetches data.
- `mockToken` — JWT-shaped string with 24h expiry.
- `seedToken(page, token)` — pre-populates sessionStorage + localStorage so
  `shared-auth-guard.js` doesn't redirect.
- `navigateWithToken(page, path, token)` — simulates Finance Backoffice
  handoff via `?token=` URL param.

### Tagging convention

Tests are tagged by priority for filtered CI runs:

- `@p0` — blocking (must pass 100%)
- `@p1` — critical (pass ≥95%)
- `@p2` — secondary (pass ≥85%)
- `@p3` — nice-to-have
- `@smoke` — minimal set for rapid PR feedback

## Best practices

- **Selectors:** prefer role / text / `data-testid`. Never use brittle nth-child.
- **Isolation:** never share state across tests; each test's `page` is fresh.
- **Cleanup:** Playwright resets context per test; no manual cleanup needed for
  storage / cookies.
- **Mocks:** ALWAYS mock backend via `mockedBackend()` — tests must NEVER hit
  real `be-2-report.vercel.app`.
- **Assertions:** `await expect(locator).toBeVisible()` > `locator.isVisible()`.
  The former retries, the latter doesn't.
- **Concurrent:** `fullyParallel: true` is enabled. Avoid cross-test side effects.

## CI integration

See `test-design-qa.md` for the PR / Nightly / Weekly execution model.
A GitHub Actions workflow is added in the `CI` step of Murat's menu.

## Knowledge references

- **Test strategy:** `skills/test-artifacts/test-design-qa.md`
- **Architecture testability concerns:** `skills/test-artifacts/test-design-architecture.md`
- **Risk matrix:** same as above
- **Shared library APIs:** `_bmad-output/planning-artifacts/architecture.md` (Implementation Patterns section)
