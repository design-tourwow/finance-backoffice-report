---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-21'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/project-context.md
  - _bmad-output/implementation-artifacts/epic-1-foundation.md
  - _bmad-output/implementation-artifacts/epic-2-unified-menu.md
  - _bmad-output/implementation-artifacts/epic-3-supplier-commission.md
  - _bmad-output/implementation-artifacts/epic-4-discount-sales.md
  - _bmad-output/implementation-artifacts/epic-5-order-external-summary.md
  - _bmad-output/implementation-artifacts/epic-6-request-discount.md
  - _bmad-output/implementation-artifacts/1-1-add-4-page-routes-html-shells.md
workflowType: 'architecture'
project_name: 'finance-backoffice-report'
user_name: 'Gap'
date: '2026-04-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (40 FRs across 9 categories):**

- **Auth & Session (FR1-4):** JWT Token handoff ผ่าน URL, storage dual-path (sessionStorage + localStorage), inject into Authorization header, graceful redirect when missing.
- **Unified Navigation (FR5-7):** Single menu shared across เดิม + ใหม่, single-session navigation (no re-auth between pages), active state indicator.
- **4 Report Pages (FR8-32):** Supplier Commission / Discount Sales / Order External Summary / Request Discount — charts, sortable tables, cascading filters (country, year/quarter/month, team → job position → user).
- **Shared Filter Data (FR33-36):** Country, team, job position, user APIs feeding dropdowns.
- **Formatting Utilities (FR37-38):** Thai-locale currency formatting, Buddhist calendar dates (DD/MM/YYYY+543).
- **Routing (FR39-40):** `server.js` (local dev) + `vercel.json` (production) must both resolve all 4 new paths.

**Non-Functional Requirements (10 NFRs):**

- **Security (NFR1-4):** Token cleaned from URL post-capture; HTTPS-only (Vercel-enforced); header-only token transit; no sensitive data beyond JWT in client storage.
- **Reliability (NFR5-6):** API failure never crashes or blanks the page; zero regression on existing pages.
- **Integration (NFR7-8):** API contract UNCHANGED from fe-2-project; Authorization header format must match backend expectation (`Bearer <jwt>`).
- **Maintainability (NFR9-10):** 3-file-per-page pattern (`.html` + `.js` + `.css`); **no bundler or build tool** — code must run directly in the browser.

### Scale & Complexity

- **Primary domain:** Frontend web application (internal reporting) with cross-domain API integration.
- **Complexity level:** Medium — brownfield with technology-migration constraints (React → Vanilla JS), cross-stack behavioral parity requirement, multi-backend integration.
- **Estimated architectural components — 5 foundational layers:**
  1. **Auth boundary** — URL capture → storage → header injection → guard redirect.
  2. **Routing layer** — `server.js` local dev server + Vercel rewrites.
  3. **Shared menu component** — cross-page navigation with active state.
  4. **Shared services layer** — `SharedFilterService`, `SharedUtils`, per-page API modules.
  5. **Page modules** — 4 self-contained triplets (`html` + `css` + `js` + `-api.js`).

### Technical Constraints & Dependencies

**Hard constraints:**

- ❌ No bundler, transpiler, build tool (NFR10).
- ❌ No framework (React / Vue / Angular) — vanilla JS only.
- ❌ No Tailwind classes on new pages (PRD stack decision).
- ❌ No API contract changes (NFR7) — backend is out of scope.
- ✅ Browser-only runtime — modern evergreen (Chrome / Edge / Safari latest).

**External dependencies:**

- `https://be-2-report.vercel.app` — fe-2 backend (hardcoded URL, not env-configured).
- `https://fonts.googleapis.com/css2?family=Kanit` — Google Fonts CDN.
- `https://cdn.jsdelivr.net/npm/chart.js` — Chart.js CDN (new pages only).
- Login redirect targets:
  - `financebackoffice.tourwow.com/login` (prod).
  - `financebackoffice-staging2.tourwow.com/login` (staging).

**Project-specific constraints (from `project-context.md`):**

- Flat repository layout (no subdirectories per feature).
- IIFE bootstrapping pattern for page init.
- Shared modules as plain `<script>` tags (not ES module imports).
- Accessibility expected: semantic landmarks, skip links, ARIA, keyboard handling, visible focus.
- Thai-facing product copy, English developer-facing comments.

### Cross-Cutting Concerns

| Concern | Scope | Resolved by |
|---|---|---|
| **JWT lifecycle** | all 4 new pages + existing pages | `token-utils.js` + `shared-auth-guard.js` + `shared-filter-service.js` |
| **Filter data loading** | all 4 new pages | `shared-filter-service.js` (`getCountries` / `getTeams` / `getJobPositions` / `getUsers`) |
| **Number / date formatting** | all 4 new pages | `shared-utils.js` (`formatCurrency`, `formatDateTH`, `getYear/Month/QuarterOptions`) |
| **Menu rendering + active state** | all pages (old + new) | `menu-component.js` (`MENU_ITEMS`, `renderSidebarMenu`, `renderHeaderMenu`) |
| **Error handling pattern** | all 4 new pages | Inline error banner + never-throw filter service |
| **API base URL resolution** | all 4 new pages | `window.FE2_API_BASE_URL` set in each HTML shell |
| **Deployment gate** | whole repo | `ignore-build.sh` requires `[deploy]` tag OR manual `vercel --prod` |

### Key Architectural Tensions

1. **"Ship the smallest thing" vs. "Zero regression"** — additive-only changes to `menu-component.js` and shared files to avoid touching existing pages.
2. **"Feature parity with fe-2" vs. "No React"** — Chart.js replaces Recharts; plain DOM + closure state replaces React hooks; checkbox in-memory filter replaces `useEffect` pattern.
3. **"No build tool" vs. "Code reuse"** — shared utilities via `window.*` globals and strict `<script>` load order instead of ES module imports.
4. **"Hardcoded API base" vs. "Environment-aware config"** — `FE2_API_BASE_URL` hardcoded to production `be-2-report.vercel.app` (acceptable per PRD but flagged: no staging equivalent for fe-2 backend).

## Starter Template Evaluation

### Primary Technology Domain

**Vanilla Static Web Application** — HTML5 + CSS3 + Vanilla JavaScript (ES6+), served by a minimal Node `http` dev server and Vercel static hosting in production.

### Starter Options Considered

**Evaluation deliberately skipped** for the following documented reasons:

1. **NFR10 hard-blocks all starter templates:** _"ไม่ใช้ bundler, transpiler, หรือ build tool — code run ใน browser ได้โดยตรง."_ Every mainstream starter (Next.js, Vite, Remix, SvelteKit, Astro, Parcel, CRA) violates this.
2. **Brownfield repo has established conventions** that act as the de-facto starter:
   - Flat root-level file layout (one page = `.html` + `.js` + `.css` at root).
   - `server.js` (~80 lines, zero dependencies) for local dev.
   - `vercel.json` rewrites for production.
   - IIFE pattern for page bootstrapping.
   - Shared modules via `<script>` tags + `window.*` globals.
   - `menu-component.js` as navigation singleton.
3. **Precedent established** — 5 existing production pages (`index`, `tour-image-manager`, `sales-by-country`, `wholesale-destinations`, `commission-report-plus`, `work-list`) follow this pattern. 4 new pages (`supplier-commission`, `discount-sales`, `order-external-summary`, `request-discount`) also conform.

### Selected "Starter": Existing Repo Conventions

**Rationale:** The repository itself IS the starter. Adding any framework or build tool would invalidate NFR10 and require migrating all existing pages — a scope explicitly excluded by NFR6 (zero regression on existing pages).

**"Initialization" for a new page (reference pattern):**

```bash
# Not a CLI — just create 3 files following the naming convention
touch {page-name}.html {page-name}.js {page-name}.css
# (optionally) touch {page-name}-api.js for pages with backend calls
```

**Then:**

1. Add route mapping to `server.js` (`urlWithoutQuery === '/{page-name}'` branch).
2. Add rewrite entry to `vercel.json` (`"source": "/{page-name}"` → `"destination": "/{page-name}.html"`).
3. Add entry to `MENU_ITEMS` array in `menu-component.js`.
4. Load the required shared scripts in order inside the `.html` head/body: `token-utils.js` → `shared-auth-guard.js` → `shared-utils.js` → `shared-filter-service.js` → `menu-component.js` → `{page-name}-api.js` → `{page-name}.js`.

### Architectural Decisions Pre-Made by This "Starter"

| Area | Decision |
|---|---|
| Language | Vanilla JS (ES6+), no TS, no compile |
| Styling | Plain CSS3 per page (`[page-name].css`) + shared `tour-image-manager.css` for app shell |
| Module system | `<script>` tags with explicit load order; IIFE pattern; `window.*` globals |
| Routing | File-based dual mapping (`server.js` + `vercel.json`) |
| Server | Node.js built-in `http` + `fs` modules; zero npm deps |
| Production hosting | Vercel static + rewrites |
| Auth | JWT in `sessionStorage` + `localStorage`; `Bearer` header; URL-param capture → strip |
| Chart rendering | Chart.js via CDN (new pages); no chart lib in old pages |
| Testing | Manual browser verification; no unit test framework |
| Accessibility | Semantic HTML, skip links, ARIA, keyboard handling (expected, not enforced by tooling) |

**Note:** No project-init story is needed — the repo is already initialized and in production. Future architectural decisions build on top of this foundation.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (already implemented & shipped):**

- MPA over SPA; Vanilla JS over framework; JWT Bearer auth.
- Two parallel backends in use (`be-2-report` for 4 new pages + `finance-backoffice-report-api` for existing pages).
- Chart.js via CDN as the Recharts replacement.
- `SharedFilterService` + `SharedUtils` as shared service layer exposed via `window.*` globals.

**Important Decisions (shape architecture):**

- Per-page IIFE closure as the state container (no global store).
- In-memory cache only on Request Discount (`allOrdersData`); other pages refetch on filter change.
- Hardcoded API base URLs (no `.env` without a build step).
- Manual `vercel --prod --yes` as the primary deploy mechanism, not git-push auto-deploy (unreliable on this repo).

**Deferred Decisions (post-MVP — to be revisited in Phase 2 per PRD Growth phase):**

- **CSP headers** in `vercel.json` to harden against token exfiltration via XSS.
- **Staging fe-2 backend** — today both staging and production frontends hit the prod `be-2-report.vercel.app`, creating risk of staging writes polluting prod data.
- **Error tracking / monitoring** — no Sentry / LogRocket / uptime monitor; failures in production are discovered via user complaints.
- **Formal test framework** — no unit or E2E suite; verification is fully manual.
- **fe-2-project retirement** once all pages reach feature parity (PRD Growth Phase 2).

### Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Client-side persistence | **None** (data is read-through from external APIs) | PRD Out-of-Scope: no backend/DB changes |
| Client-side caching | **None by default.** Exception: `allOrdersData` closure cache in `request-discount.js` for in-memory checkbox filtering (Story 6.3) | Matches fe-2 React `useEffect` pattern; avoids redundant API calls on checkbox toggles |
| Data validation | **Trust API**; defensive null-checks only at the render boundary | No TypeScript types; follows project-context rule _"prefer explicit null checks around DOM queries"_ |
| Data normalization | Each `-api.js` module normalizes response to a flat array (handles both `{ data: [...] }` wrappers and raw arrays) | Different endpoints return different shapes; normalization centralized per page API module |

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| Auth method | **JWT Bearer token** (external issuer — Finance Backoffice) | fe-2 backend expectation (NFR8); auth issuance delegated |
| Token transport — inbound | URL query param `?token=xxx` on first arrival | Handoff from Finance Backoffice (FR1) |
| Token transport — outbound | `Authorization: Bearer <jwt>` header on every API call | NFR3: never in URL of API calls |
| Token storage | **Both** `sessionStorage` AND `localStorage` (key: `authToken`) | `TokenUtils.getToken()` checks sessionStorage first, localStorage fallback; dual-write covers pre-existing app patterns |
| URL cleanup | `history.replaceState` removes `?token` post-capture | NFR1: no exposure in browser history |
| Missing-token handling | Redirect to `financebackoffice*.tourwow.com/login` (env-detected by hostname) | FR4 graceful redirect |
| Token expiry check | Client-side JWT `exp` decode via `TokenUtils.isTokenExpired()` | No backend round-trip; acceptable for internal tool |
| CSRF | **Not implemented** — header-based auth is immune to CSRF | Header is not auto-sent by browser cross-site |
| CSP headers | **Not configured** in `vercel.json` — **DEFERRED to Phase 2** | CDN-loaded Chart.js and inline config scripts currently allowed by default; tightening is a future hardening story |

### API & Communication

| Decision | Choice | Rationale |
|---|---|---|
| Protocol | **REST over HTTPS** | Match existing fe-2 backend |
| Serialization | JSON | Default |
| API base URL resolution | Hardcoded per HTML shell: `window.FE2_API_BASE_URL = 'https://be-2-report.vercel.app'` and hostname-detected `window.API_BASE_URL` for this project's own API | Vanilla JS has no `.env` without build; hostname-based detection preserves flexibility for the project's own staging |
| Parameter passing | Query string via `URLSearchParams` | Simple, cacheable, debuggable |
| Error handling — filter service | **Never throws** — `getCountries / getTeams / getJobPositions / getUsers` return `[]` on any failure | Story 1.3 AC5: prevents dropdown-load errors from crashing the page |
| Error handling — page APIs | **Throws Error** → page catches → renders inline error banner | NFR5: no blank page, clear message |
| 401 handling | API modules intercept 401 → `TokenUtils.redirectToLogin()` | Uniform session-expiry UX |
| Backend topology | Two backends in parallel: `be-2-report` (4 new pages) + `finance-backoffice-report-api` (old pages) | PRD decision — not a backend consolidation initiative |

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Application model | **MPA** (Multi-Page App) — each page is its own HTML file | NFR10 forbids bundler; MPA is natively build-free |
| Client-side routing | **None** — browser handles `<a href>` natively; `server.js` + `vercel.json` map URL → HTML | Simpler than hash/history SPA router; SEO-friendly |
| State management | **Closure variables inside page IIFE** — no Redux / Zustand / Signals | No framework; state scope = one page lifetime |
| DOM manipulation | Mix of `innerHTML` (bulk render) + `addEventListener` (delegated where practical) | Chosen per case; no virtual DOM library |
| Rendering strategy | Server-shell HTML with `<div id="page-content">` placeholder → page JS fills it | Lets page load progressively; auth guard runs before content appears |
| Chart library | **Chart.js** (latest via `https://cdn.jsdelivr.net/npm/chart.js`) for 4 new pages | PRD-approved alternative to Recharts; no-build friendly |
| CSS strategy | **Plain CSS3** per page file + shared `tour-image-manager.css` for app shell | No Tailwind on new pages (PRD); scoped via class prefixes (`sc-*`, `ds-*`, `oes-*`, `rd-*`) |
| Accessibility | Semantic HTML, skip links, ARIA labels, keyboard focus management | project-context rule; expected but not auto-tested |
| Browser target | Modern evergreen (Chrome / Edge / Safari latest) | PRD desktop-first scope |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | **Vercel static + rewrites** | Existing infra; zero-config for HTML+CSS+JS |
| Dev server | Node.js built-in `http` + `fs` in `server.js` | Zero dependencies; no `package.json` |
| Deployment gate | `ignore-build.sh` — skips auto-deploy on `main` unless commit includes `[deploy]` tag | Existing convention; prevents accidental ship |
| Deployment workflow | **Primary:** `npx vercel --prod --yes` manual from repo root. **Backup:** commit with `[deploy]` in message. | Git-push auto-deploy observed unreliable (4 consecutive "Canceled" states on 2026-04-21) |
| Environment config | Hostname-based detection in inline `<script>` at top of HTML | No build-time env injection possible |
| CI/CD tests | **None** — **DEFERRED to Phase 2** (consider Playwright for smoke E2E) | No test framework in repo; verification is manual browser testing |
| Monitoring / logging | **Client-side `console.*` only** — **DEFERRED to Phase 2** (e.g. Sentry) | No error-tracking, no uptime monitor |
| Scaling | Vercel edge CDN delivers static assets; stateless client; no server session | Inherent from static-hosting model |
| Backup / DR | GitHub as source of truth | No build artifacts other than source |

### Decision Impact Analysis

**Implementation Sequence (already shipped — for reference):**

1. Routes (`server.js` + `vercel.json`) + HTML shells — Story 1.1.
2. Shared utilities (`shared-utils.js`, `shared-filter-service.js`, `shared-auth-guard.js`) — Stories 1.2–1.4.
3. Unified menu update (`menu-component.js`) — Story 2.1 (restructured post-ship to Report P'NUT / Report P'OH groupings).
4. Per-page implementation (4 pages, independent) — Epics 3–6.
5. Production deploy via `vercel --prod --yes`.

**Cross-Component Dependencies:**

- Every page depends on `window.FE2_API_BASE_URL` (set by HTML shell) + `window.TokenUtils` (from `token-utils.js`).
- Every page depends on `window.SharedFilterService` + `window.SharedUtils` for dropdowns and formatting.
- `shared-auth-guard.js` must run **before** any other script that could trigger an API call — enforced by `<script>` load order in each HTML shell.
- `menu-component.js` depends on the DOM containing `<nav class="nav-menu">` (sidebar) and `<ul class="navbar-list">` (topbar) — every page must preserve these placeholders.
- `ignore-build.sh` applies to **every** git push; any contributor must know the `[deploy]` convention or use manual CLI deploy.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

9 categories of consistency rules — extracted from shipped code, not prescriptive invention:

1. Naming · 2. Structure · 3. Format · 4. State & Communication · 5. Error Handling · 6. Loading States · 7. Authentication Flow · 8. Deployment · 9. Accessibility.

### Naming Patterns

**File naming (flat root layout):**

- Page triplet: `{page-name}.html`, `{page-name}.js`, `{page-name}.css`.
- Optional per-page backend client: `{page-name}-api.js`.
- URL path equals filename without extension: `/{page-name}` ↔ `{page-name}.html`.
- Shared fe-2 ported modules: `fe2-{purpose}.js` (e.g., `shared-utils.js`, `shared-auth-guard.js`, `shared-filter-service.js`).
- Kebab-case throughout for filenames and URLs.
- ❌ **Anti-pattern:** nesting files in subdirectories (`pages/foo.html`).
- ❌ **Anti-pattern:** camelCase or PascalCase filenames.

**JavaScript identifiers:**

- Functions and local variables: `camelCase` (`renderFilterPanel`, `applyCheckboxFilters`).
- Window global namespaces: `PascalCase` (`TokenUtils`, `SharedUtils`, `SharedFilterService`, `SupplierCommissionAPI`, `DiscountSalesAPI`, `OrderExternalAPI`, `RequestDiscountAPI`).
- Constants: `UPPER_SNAKE_CASE` (`MENU_ITEMS`, `API_BASE_URL`).
- Chart.js instances: suffix `Chart` (e.g., `commissionChart`).

**CSS class naming:**

- Page-scoped prefix per page: `sc-*` (supplier-commission), `ds-*` (discount-sales), `oes-*` (order-external-summary), `rd-*` (request-discount).
- Shell / shared classes (no prefix): `.sidebar`, `.nav-menu`, `.navbar-list`, `.main-content`, `.page-header`, `.breadcrumb`.
- BEM-style modifiers where helpful (`.sc-sort-btn.active`).
- ❌ **Anti-pattern:** Tailwind utility classes on new pages (banned by PRD).

**API query parameters (sent by page APIs):**

- `snake_case` matching backend expectations: `year`, `quarter`, `month`, `country_id`, `team_number`, `job_position`, `user_id`.
- Optional params: omit the key entirely when not set (don't send empty string).

**Window global namespace conventions:**

- Utility library: `FE2*` (fe-2 ported).
- Token / auth: `TokenUtils`.
- Per-page API: `{PageName}API` (PascalCase suffix `API`).
- Environment: `API_BASE_URL`, `FE2_API_BASE_URL`, `ENVIRONMENT`.

### Structure Patterns

**Repository layout:**

- Flat root — every page and its companion files sit at the repo root.
- `_bmad/`, `_bmad-output/`: BMad-related (local artifacts; not critical for production).
- `assets/fonts/`: local Thai font files.
- `docs/`: markdown reference docs.
- `scripts/`: workflow helper shell scripts (`safe-push.sh`, etc.).
- `.claude/`: local Claude Code config (not pushed).

**Mandatory HTML shell structure for new pages:**

```html
<head>
  <!-- Fonts -->
  <link ... Kanit CDN ... />

  <!-- Styles: shared shell first, then page-specific -->
  <link rel="stylesheet" href="tour-image-manager.css" />
  <link rel="stylesheet" href="{page-name}.css" />

  <!-- Env config (inline IIFE) -->
  <script>
    (function(){
      window.API_BASE_URL = /* hostname-based */;
      window.FE2_API_BASE_URL = 'https://be-2-report.vercel.app';
      window.ENVIRONMENT = /* 'staging' | 'production' | 'local' */;
    })();
  </script>

  <!-- Script load ORDER MATTERS -->
  <script src="token-utils.js"></script>
  <script src="shared-auth-guard.js"></script>  <!-- runs immediately -->
  <script src="shared-utils.js"></script>
  <script src="shared-filter-service.js"></script>
  <script src="menu-component.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>  <!-- if page has charts -->
</head>
<body>
  <div class="app-wrapper">
    <aside class="sidebar"><nav class="nav-menu"></nav></aside>
    <main class="main-content">
      <nav class="top-bar"><ul class="navbar-list"></ul></nav>
      <div class="content-area">
        <nav class="breadcrumb">...</nav>
        <header class="page-header">...</header>
        <div id="page-content"></div>
      </div>
    </main>
  </div>
  <script src="{page-name}-api.js"></script>
  <script src="{page-name}.js"></script>
</body>
```

### Format Patterns

**API response handling:**

- Filter service: normalize to array `[]` on success, return `[]` on ANY failure (never throws).
- Page APIs: return normalized data on 2xx, `throw new Error(message)` on non-2xx, call `TokenUtils.redirectToLogin()` on 401.
- Response payload shape: handle BOTH `{ data: [...] }` and raw `[...]` — each `-api.js` must normalize.

**Display formats:**

- Currency: `SharedUtils.formatCurrency(value)` → Thai-locale number (no currency symbol attached; caller adds `฿` if needed).
- Dates: `SharedUtils.formatDateTH(iso)` → `DD/MM/YYYY` with Buddhist year (`+543`).
- Thai locale sort: `SharedUtils.sortCountriesByThai(arr)` — returns a copy, does not mutate input.
- Truncation for chart x-axis: `supplier_name_th.slice(0, 15) + '…'`.

**CSV export (every report page):**

- UTF-8 BOM prefix (`﻿`) so Excel opens Thai correctly.
- Footer summary row optional per page.
- Filename: `{page-name}-{YYYYMMDD}.csv`.

### State & Communication Patterns

**Per-page state container (IIFE closure):**

```js
(function(){
  'use strict';

  let filterState = { mode: 'quarter', year, quarter, country_id: '', ... };
  let allData = [];        // full dataset from last fetch
  let displayData = [];    // result after in-memory filter (if any)
  let sortKey = 'default';
  let sortDir = 'desc';
  let currentPage = 1;     // if paginated
  let chartInstance = null;

  function renderPanel() { ... }
  function applyFilters() { ... }
  function renderTable() { ... }
  function renderChart() { ... }
  function init() { ... }

  document.addEventListener('DOMContentLoaded', init);
})();
```

**Cross-page communication:**

- None — pages are fully isolated. Navigation is via normal `<a href>`.
- Shared state is limited to `authToken` in storage.

**Event handlers:**

- Attach via `addEventListener` (not inline `onclick`).
- Exception: Chart.js tooltip callbacks use Chart.js config.

### Error Handling Patterns

Three tiers of error surface:

| Tier | Where | Pattern |
|---|---|---|
| **Filter service** | `shared-filter-service.js` | Catch, `console.error('[SharedFilterService] ...')`, return `[]` — NEVER throws |
| **Page API (`*-api.js`)** | `supplier-commission-api.js` etc. | Throws `new Error('readable message')` on non-2xx; intercepts 401 to redirect |
| **Page orchestrator (`{page}.js`)** | try/catch around API call → renders `.{prefix}-error-banner` with message |

**Console log format:** `[ComponentName] message` — examples: `[TokenUtils] Token cleared`, `[SharedAuthGuard] Token saved from URL query param`.

### Loading State Patterns

- Inline HTML spinner replaces `#page-content` body region during initial fetch.
- Subsequent filter Apply clicks: swap the table body only; chart is kept or redrawn.
- No global loading overlay.

### Authentication Flow Pattern (enforcement order)

```
1. HTML shell loads.
2. token-utils.js defines TokenUtils.
3. shared-auth-guard.js runs IMMEDIATELY:
   a. Capture ?token= from URL → save to sessionStorage + localStorage.
   b. Strip ?token from URL via history.replaceState.
   c. If no token exists → TokenUtils.redirectToLogin() — halts execution.
4. All subsequent scripts assume a valid token is in storage.
5. API modules read token via TokenUtils.getToken() → Authorization: Bearer <jwt>.
```

- ❌ **Anti-pattern:** calling an API before `shared-auth-guard.js` has run.
- ❌ **Anti-pattern:** reading token from a storage key other than `authToken`.

### Deployment Pattern

- **Primary path:** `npx vercel --prod --yes` from repo root (bypasses `ignore-build.sh`).
- **Fallback path:** commit with `[deploy]` anywhere in the message, then `git push` — Vercel auto-builds.
- **Never:** rely on plain `git push` alone — `ignore-build.sh` will skip the build.

**Verification after deploy:**

- `curl -s https://finance-backoffice-report.vercel.app/{asset} | grep {new-string}` to confirm CDN has the new version (bypasses browser cache).

### Accessibility Pattern

- Every page must include a skip link: `<a href="#main-content" class="skip-link">ข้ามไปยังเนื้อหาหลัก</a>`.
- Semantic landmarks: `<main role="main">`, `<nav role="navigation">`.
- ARIA on dynamic controls: `aria-expanded`, `aria-current="page"` for the active menu item.
- Keyboard: buttons and links must be Tab-navigable; `Esc` closes modal dialogs.

### Enforcement Guidelines

**All AI agents modifying this project MUST:**

1. **Preserve script load order** in HTML shells — `shared-auth-guard.js` MUST run before any API-calling script.
2. **Reuse** `SharedUtils`, `SharedFilterService`, `TokenUtils` — never re-implement currency / date / filter / token logic.
3. **Update BOTH** `server.js` AND `vercel.json` when adding a route (a Critical Rule from project-context.md).
4. **Deploy via** `vercel --prod --yes` — don't trust git-push auto-deploy.
5. **Use a page-scoped CSS class prefix** (2–3 letter) for new pages to avoid style collisions.
6. **Place all page files at the repo root** — no subdirectories.

**Pattern enforcement verification:**

- New-page PRs: diff against the `supplier-commission.{html,js,css}` triplet as the reference.
- Navigation changes: verify `MENU_ITEMS` data only, not render logic.
- Auth changes: verify `shared-auth-guard.js` still runs before API scripts in `<head>` order.

### Anti-Patterns (forbidden)

| Anti-pattern | Why forbidden |
|---|---|
| ES module `import` / `export` | Requires build step (violates NFR10) |
| TypeScript | Requires compile (violates NFR10) |
| Tailwind utility classes | Requires PostCSS build (violates NFR10) |
| `jQuery` or any DOM library | Unnecessary weight; vanilla JS is enough |
| React / Vue / any VDOM framework | Requires build (violates NFR10) |
| `npm install` a runtime dependency | No `package.json`; breaks no-build model |
| Calling API before auth guard runs | Race condition; may leak unauthenticated calls |
| Adding subdirectories at repo root for features | Breaks flat-layout convention |
| Mutating external library globals | No ownership model; causes hard-to-debug collisions |

## Project Structure & Boundaries

### Complete Project Directory Structure

```
finance-backoffice-report/
├── server.js                          # Node http dev server — route → file mapping
├── vercel.json                        # Vercel rewrites + CORS/cache headers
├── ignore-build.sh                    # Vercel deploy gate (requires [deploy] tag)
├── README.md                          # project overview
├── .gitignore
├── .vercel/                           # Vercel project linkage (local only)
├── .env.local                         # local-only env (gitignored)
│
├── index.html                         # landing / auth capture page
├── auth.html                          # auth flow page
│
├── token-utils.js                     # ★ JWT lifecycle primitives (TokenUtils)
├── menu-component.js                  # ★ Shared nav (sidebar + topbar + MENU_ITEMS)
│
├── ─── FE-2 FOUNDATION (Epic 1) ─────────────────────────────────
├── shared-auth-guard.js                  # Self-running IIFE — URL capture + guard
├── shared-utils.js                       # SharedUtils — format/date/filter helpers
├── shared-filter-service.js              # SharedFilterService — countries/teams/users/jps
│
├── ─── PAGE TRIPLETS ────────────────────────────────────────────
├── tour-image-manager.{html,js,css}   # [existing, untouched]
├── tour-image-manager.css             # ★ app-shell CSS (shared by ALL pages)
├── tour-image-manager-api.js          # existing page API
├── sales-by-country.{html,js,css}     # [existing, untouched]
├── sales-by-country-api.js
├── wholesale-destinations.{html,js,css}
├── wholesale-destinations-api.js
├── commission-report-plus.{html,js,css}
├── commission-report-plus-api.js
├── work-list.{html,js,css}            # [existing, untouched]
├── work-list-api.js
│
├── ─── NEW FE-2 PAGES (Epics 3–6) ───────────────────────────────
├── supplier-commission.{html,js,css}  # Epic 3
├── supplier-commission-api.js
├── discount-sales.{html,js,css}       # Epic 4
├── discount-sales-api.js
├── order-external-summary.{html,js,css}  # Epic 5
├── order-external-summary-api.js
├── request-discount.{html,js,css}     # Epic 6
├── request-discount-api.js
│
├── ─── SHARED UI COMPONENTS ─────────────────────────────────────
├── country-filter-component.js
├── date-picker-component.{js,css}
├── filter-sort-dropdown-component.{js,css}
├── period-filter-component.js
├── searchable-dropdown-component.{js,css}
├── table-sorting-component.{js,css}
├── api-service.js                     # shared API patterns for Tour Image Manager
├── mock-api.js                        # dev-only mock data
│
├── assets/
│   └── fonts/
│       ├── Kanit-Regular.ttf
│       └── Sarabun-Regular.ttf
│
├── docs/                              # markdown reference docs
│
├── scripts/                           # git / deployment helpers
│   ├── check-ownership.sh
│   └── safe-push.sh
│
├── _bmad/                             # BMad module cache (local)
├── _bmad-output/                      # BMad artifacts
│   ├── project-context.md
│   ├── planning-artifacts/
│   │   ├── prd.md
│   │   ├── epics.md
│   │   └── architecture.md            # ← this file
│   └── implementation-artifacts/
│       ├── epic-1-foundation.md
│       ├── epic-2-unified-menu.md
│       ├── epic-3-supplier-commission.md
│       ├── epic-4-discount-sales.md
│       ├── epic-5-order-external-summary.md
│       └── epic-6-request-discount.md
│
└── .claude/                           # local Claude Code session data (not pushed)
```

**Legend:** `★` = critical cross-cutting file; `[existing, untouched]` = pre-existing pages not affected by this initiative.

### Architectural Boundaries

**External API Boundaries:**

| Backend | Base URL | Used by |
|---|---|---|
| fe-2 Report API | `https://be-2-report.vercel.app` (hardcoded) | `supplier-commission-api.js`, `discount-sales-api.js`, `order-external-summary-api.js`, `request-discount-api.js`, `shared-filter-service.js` |
| Finance Backoffice Report API | `window.API_BASE_URL` (hostname-detected) | `sales-by-country-api.js`, `wholesale-destinations-api.js`, `commission-report-plus-api.js`, `work-list-api.js`, `tour-image-manager-api.js` |

**Component Boundaries:**

- **Shell (app-wrapper + sidebar + topbar)** — defined in `tour-image-manager.css` + rendered by `menu-component.js`. All pages render their content inside `<div id="page-content">` only. Shell is read-only from a page's perspective.
- **Auth layer** — `token-utils.js` + `shared-auth-guard.js` are the only owners of token lifecycle. Pages and APIs CALL these, never duplicate.
- **Filter service** — `shared-filter-service.js` owns filter-dropdown data loading. Pages consume, never re-fetch directly.
- **Utility library** — `shared-utils.js` owns formatting logic. Pages consume `SharedUtils.*`, never re-implement.
- **Page module** — each page's JS owns its own render + state (via IIFE closure). No cross-page state sharing beyond `authToken` in storage.
- **Page API module** — `{page}-api.js` is the only file that talks to the backend for that page. Page JS calls `{PageName}API.fetch(...)`, never `fetch(...)` directly.

**Data Boundaries:**

- Backend owns all data. Client never writes (reports are read-only).
- In-memory cache boundary: `allOrdersData` inside `request-discount.js` closure only — NOT shared.
- Token is the only piece of data persisted in client storage.

### Requirements → Structure Mapping

| Epic | FRs covered | Files owning the implementation |
|---|---|---|
| **Epic 1: Foundation** | FR1–4, FR33–40 | `server.js`, `vercel.json`, `token-utils.js`, `shared-auth-guard.js`, `shared-utils.js`, `shared-filter-service.js`; HTML shells for 4 new pages |
| **Epic 2: Unified Menu** | FR5–7 | `menu-component.js` (`MENU_ITEMS` only — render logic unchanged) |
| **Epic 3: Supplier Commission** | FR8–15 | `supplier-commission.html`, `supplier-commission.js`, `supplier-commission.css`, `supplier-commission-api.js` |
| **Epic 4: Discount Sales** | FR16–21 | `discount-sales.html`, `discount-sales.js`, `discount-sales.css`, `discount-sales-api.js` |
| **Epic 5: Order External Summary** | FR22–26 | `order-external-summary.html`, `order-external-summary.js`, `order-external-summary.css`, `order-external-summary-api.js` |
| **Epic 6: Request Discount** | FR27–32 | `request-discount.html`, `request-discount.js`, `request-discount.css`, `request-discount-api.js` |

**Cross-Cutting Concerns → Location:**

| Concern | Owner File(s) | Note |
|---|---|---|
| JWT capture + redirect | `shared-auth-guard.js` + `token-utils.js` | Runs on every new page before any API |
| Authorization header injection | Inside each `*-api.js` via `TokenUtils.getToken()` | No central HTTP client — pattern is duplicated per page API |
| Dropdown data (country/team/jp/user) | `shared-filter-service.js` | Shared across all 4 new pages |
| Currency / date / period helpers | `shared-utils.js` | Shared across all 4 new pages |
| Menu render + active state | `menu-component.js` | Shared across ALL pages (old + new) |
| Chart rendering | Chart.js CDN + per-page instance | Scoped to 3 of 4 new pages (epic 5 has no chart) |
| Error banner | Per-page CSS class `{prefix}-error-*` | Not centralized — each page owns its error UI style |

### Integration Points

**Internal Communication (within the frontend):**

- None direct — pages are isolated. Navigation via `<a href>` + full page reload.
- Token is the only shared state, via `sessionStorage`/`localStorage`.

**External Integrations:**

| System | Direction | Purpose |
|---|---|---|
| `financebackoffice*.tourwow.com/login` | Outbound redirect | Auth flow entry / re-auth |
| Finance Backoffice (upstream) | Inbound via `?token=` URL | JWT handoff |
| `be-2-report.vercel.app` | Outbound REST (JSON + Bearer) | 4 new report data + filter lookups |
| `finance-backoffice-report-api.vercel.app` | Outbound REST (JSON + Bearer) | Old report pages |
| Google Fonts CDN | Outbound CSS | Kanit typeface |
| jsDelivr CDN | Outbound JS | Chart.js |

**Data Flow (typical request — e.g. Supplier Commission):**

```
User clicks Finance Backoffice "Report Plus"
  → Browser navigates to /supplier-commission?token=<jwt>
  → HTML shell loads, inline script sets window.FE2_API_BASE_URL
  → token-utils.js defines TokenUtils
  → shared-auth-guard.js runs:
     • saves token to sessionStorage + localStorage
     • history.replaceState removes ?token from URL
  → shared-utils.js + shared-filter-service.js + menu-component.js load
  → menu-component.js renders sidebar + topbar into DOM placeholders
  → supplier-commission-api.js defines SupplierCommissionAPI
  → supplier-commission.js DOMContentLoaded handler:
     • renders filter panel
     • SharedFilterService.getCountries() / getTeams() → populate dropdowns
     • SupplierCommissionAPI.fetchReport(defaultFilters) → data
     • Chart.js + table render
  → User applies filters → repeat fetchReport → re-render
```

### File Organization Patterns

**Configuration files (repo root):**

- `server.js` (dev), `vercel.json` (prod), `ignore-build.sh` (Vercel build gate), `.env.local` (local secrets).
- No `package.json` — intentional.

**Source organization:**

- **Flat root** for all page and module files.
- Grouped implicitly by filename prefix (`{page-name}.*`, `fe2-*.js`, `{component}-component.{js,css}`).

**Test organization:**

- None. Manual browser verification only.
- Future: if Playwright adopted (deferred decision), suggested location: `tests/e2e/{page-name}.spec.ts` at repo root.

**Asset organization:**

- `assets/fonts/` — locally bundled Thai fonts.
- CDN-sourced assets (Kanit, Chart.js) loaded via `<link>`/`<script>`.

### Development Workflow Integration

**Dev loop:**

```bash
node server.js                       # serves on :8080
# Open http://localhost:8080/{page}?token=<local-jwt>
```

**Deploy loop (primary):**

```bash
# From repo root, after pushing to GitHub
npx vercel --prod --yes              # bypasses ignore-build.sh
# Verify via curl against live URL
```

**Alternative deploy (via git):**

```bash
git commit -m "[deploy] <message>"   # tag enables Vercel build
git push origin main
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

- All decisions compose cleanly: MPA + no-build + IIFE + `window.*` globals form a coherent stack.
- Chart.js CDN is build-free and compatible with vanilla DOM — no React context leakage.
- Dual-backend topology (`be-2-report` + `finance-backoffice-report-api`) does not conflict because each page's `-api.js` owns its own base URL.
- JWT Bearer pattern is consistent across BOTH backends (verified via NFR8).

**Pattern Consistency:**

- Every new page follows the same file triplet (`.html` + `.js` + `.css`) + optional `-api.js`.
- Every new page loads scripts in the same documented order.
- CSS class prefixes (`sc-*` / `ds-*` / `oes-*` / `rd-*`) are page-scoped with no documented collisions.
- Error tiers (filter service → page API → page orchestrator) are applied uniformly across all 4 new pages.

**Structure Alignment:**

- Flat repo layout supports the no-build constraint: browser can resolve every `<script src>` path directly.
- Shell DOM contract (`<nav class="nav-menu">`, `<ul class="navbar-list">`, `<div id="page-content">`) is honoured by all 4 new pages and pre-existing pages.
- Route mapping is consistent in both `server.js` (local) and `vercel.json` (prod).

### Requirements Coverage Validation ✅

**Epic Coverage (6 / 6):**

| Epic | Status | Evidence |
|---|---|---|
| Epic 1 — Foundation | ✅ Implemented | `shared-auth-guard.js`, `shared-utils.js`, `shared-filter-service.js`, routes in `server.js` + `vercel.json` |
| Epic 2 — Unified Menu | ✅ Implemented | `menu-component.js` MENU_ITEMS restructured to Report P'NUT / Report P'OH |
| Epic 3 — Supplier Commission | ✅ Implemented | `supplier-commission.{html,js,css,api.js}` |
| Epic 4 — Discount Sales | ✅ Implemented | `discount-sales.{html,js,css,api.js}` |
| Epic 5 — Order External Summary | ✅ Implemented | `order-external-summary.{html,js,css,api.js}` |
| Epic 6 — Request Discount | ✅ Implemented | `request-discount.{html,js,css,api.js}` |

**Functional Requirements Coverage (40 / 40):**

- **FR1–4 (Auth):** `shared-auth-guard.js` + `token-utils.js` — covered.
- **FR5–7 (Nav):** `menu-component.js` + MENU_ITEMS — covered.
- **FR8–15 (Supplier Commission):** Epic 3 files — covered.
- **FR16–21 (Discount Sales):** Epic 4 files — covered.
- **FR22–26 (Order External Summary):** Epic 5 files — covered.
- **FR27–32 (Request Discount):** Epic 6 files — covered (incl. in-memory checkbox filter FR31 behavior).
- **FR33–36 (Shared filter data):** `shared-filter-service.js` — covered.
- **FR37–38 (Formatting utilities):** `shared-utils.formatCurrency` + `formatDateTH` — covered.
- **FR39–40 (Routing):** `server.js` + `vercel.json` — covered.

**Non-Functional Requirements Coverage (10 / 10):**

| NFR | Status | How addressed |
|---|---|---|
| NFR1 — Token cleaned from URL | ✅ | `history.replaceState` in `shared-auth-guard.js` |
| NFR2 — HTTPS only | ✅ | Vercel-enforced; `be-2-report` is HTTPS |
| NFR3 — Token in header, not URL | ✅ | API modules set `Authorization: Bearer` header |
| NFR4 — No sensitive data beyond JWT | ✅ | Only `authToken` key written to storage |
| NFR5 — API failure never blanks page | ✅ | Three-tier error pattern; filter service returns `[]`; page APIs throw → orchestrator renders banner |
| NFR6 — Zero regression on existing pages | ✅ | No edits to existing page files; `menu-component.js` only touched `MENU_ITEMS` data |
| NFR7 — API contract unchanged | ✅ | Endpoints match fe-2-project; no backend edits |
| NFR8 — Authorization header format | ✅ | `Bearer <jwt>` verified in each `-api.js` |
| NFR9 — 3-file pattern per page | ✅ | All 4 new pages conform (+ `-api.js` addition) |
| NFR10 — No build tool | ✅ | Zero build step; no `package.json`; browser runs code directly |

### Implementation Readiness Validation ✅

**Decision Completeness:** All 5 categories documented with rationale. Deferred items explicitly flagged (CSP, staging backend, monitoring, formal tests, fe-2 retirement).

**Structure Completeness:** Full directory tree documented; every epic mapped to specific files; cross-cutting concerns have named owner files.

**Pattern Completeness:** 9 pattern categories cover all identified conflict points. Enforcement guidelines provided. Anti-patterns explicitly listed.

### Gap Analysis Results

**Critical Gaps:** **None identified** — implementation is shipped and production-verified.

**Important Gaps (deferred, not blocking):**

1. **No automated tests** — regression on any future change is user-discovered. Recommend adding a minimal Playwright smoke test per page in Phase 2.
2. **No monitoring / error tracking** — production errors are invisible until users complain. Sentry or similar recommended before onboarding non-pilot users.
3. **No CSP in `vercel.json`** — current policy allows any inline script, mitigatable attack surface for JWT exfiltration if a future XSS is introduced.
4. **No staging equivalent of `be-2-report` backend** — staging frontend hits prod backend, creating data-pollution risk during QA.

**Nice-to-Have Gaps:**

1. Consolidating the three `fe2-*.js` into a single shared "FE2" namespace could reduce script-tag noise — deferred; current separation is fine.
2. A shared `error-banner-component.js` could normalize the inline error UI across pages — optional.
3. `.vercelignore` to formally exclude `_bmad*/` and `.claude/` from deploys — cosmetic; they're small.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (brownfield brief, existing pages catalogued)
- [x] Scale and complexity assessed (medium; cross-stack port)
- [x] Technical constraints identified (NFR10 no-build, NFR7 no API changes)
- [x] Cross-cutting concerns mapped (auth, filter, utils, menu, error, deploy)

**✅ Architectural Decisions**
- [x] Critical decisions documented (MPA, vanilla JS, JWT, Chart.js CDN)
- [x] Technology stack fully specified
- [x] Integration patterns defined (REST, Bearer, JSON, query-string params)
- [x] Reliability considerations addressed (three-tier error pattern)

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented (auth flow, error, loading, deploy)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements-to-structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** ✅ **READY — already shipped and in production**

**Confidence Level:** **High** — architecture is not theoretical; it is running and reverse-documented from shipped code with direct PRD/Epic cross-referencing.

**Key Strengths:**

- Zero-build footprint preserves simplicity and aligns with the NFR10 constraint.
- Clean separation between shell, shared services, and per-page modules makes adding a new page a mechanical exercise.
- Dual-backend topology insulates fe-2 migration from this project's own legacy pages.
- Deploy mechanism (manual `vercel --prod --yes`) is reliable once the `ignore-build.sh` trap is known.

**Areas for Future Enhancement:**

- Observability (Sentry, uptime, CSP headers).
- QA automation (Playwright smoke tests).
- Retire fe-2-project once parity is confirmed (PRD Phase 2).
- Consider introducing a tiny fetch wrapper (`shared-http.js`) to centralize the 401-redirect and auth-header injection currently duplicated per `-api.js`.

### Implementation Handoff

**AI Agent Guidelines:**

- Follow the 9 implementation patterns and the enforcement guidelines exactly.
- For a new report page: diff against `supplier-commission.{html,js,css,api.js}` as reference; replicate file triplet; update `server.js` + `vercel.json` + `MENU_ITEMS`; deploy via `vercel --prod --yes`.
- For auth changes: touch only `token-utils.js` + `shared-auth-guard.js`; never duplicate token logic into pages.
- For cross-page utilities: extend `shared-utils.js` or `shared-filter-service.js`; do not inline.

**First Implementation Priority (for the NEXT initiative beyond current scope):**

Nothing — current scope is shipped. Next logical step is **Epic 7 (recommended)**: observability + CSP hardening, or **Epic 7 (alternative)**: fe-2-project retirement. To be prioritized separately via PRD update.
