---
project_name: 'finance-backoffice-report'
user_name: 'Gap'
date: '2026-04-21'
sections_completed: ['technology_stack', 'existing_patterns', 'critical_rules']
existing_patterns_found: 9
---

# Project Context for AI Agents

_This file captures the non-obvious rules and implementation patterns that AI agents must follow in this repository._

## Technology Stack & Versions

- HTML5 for all page shells and navigation surfaces
- CSS3 for responsive layout, component styling, and print/mobile behavior
- Vanilla JavaScript (ES6+) for application logic and DOM behavior
- Node.js built-in `http` and `fs` modules for the local static server in [`server.js`](/Users/gap/finance-backoffice-report/server.js)
- Vercel rewrites and response headers in [`vercel.json`](/Users/gap/finance-backoffice-report/vercel.json)
- Google Fonts `Kanit` loaded from CDN in the main shell
- Local Thai-capable font assets under [`assets/fonts/`](/Users/gap/finance-backoffice-report/assets/fonts)
- No `package.json` exists, so there is no package-managed dependency graph or formal build pipeline
- Markdown documentation is used heavily for workflow and backend requirements notes

## Existing Patterns

- Flat repository layout with page files, JS files, CSS files, and docs side by side at the root
- Route-specific HTML entry points such as `index.html`, `auth.html`, `tour-image-manager.html`, `order-report.html`, `sales-by-country.html`, `wholesale-destinations.html`, `commission-report-plus.html`, and `work-list.html`
- Shared modules are plain scripts, not imports, and are typically named by concern using two conventions:
  - **`*-component.js` suffix** — encapsulated UI widgets that render into a container. Examples: `menu-component.js`, `date-picker-component.js`, `filter-sort-dropdown-component.js`, `searchable-dropdown-component.js`, `table-sorting-component.js`, `filter-search-dropdown-component.js` (Phase 3), `report-filter-panel-component.js` (Phase 3).
  - **`shared-*.js` prefix, no suffix** — cross-page utilities and base styles with no autonomous UI lifecycle. Examples: `shared-auth-guard.js`, `shared-utils.js`, `shared-http.js`, `shared-filter-service.js`, `shared-ui.js` (+ `shared-ui.css`), `shared-chart.js`, `shared-table.js`, `shared-csv.js`.
- Generic wrapper CSS lives at the root with no suffix: `filter-panel.css` owns `.filter-*` layout classes + design tokens (`--color-primary`, `--radius-card`, etc.) consumed by all report pages.
- **Orphan component rule**: a component file is only kept if at least one page calls it. Zero-caller components get deleted (git history is the archive).
- **No cross-page CSS cross-loading**: a page HTML must not `<link>` another page's CSS. Shared layout rules live in `filter-panel.css` or `tour-image-manager.css`.
- Bootstrapping code is commonly wrapped in IIFEs to keep the global scope clean
- Application state is often kept in `localStorage` or `sessionStorage`
- The UI mixes English docs with Thai-facing product copy
- Accessibility is expected: semantic landmarks, skip links, ARIA labels, keyboard handling, and visible focus behavior
- Workflow scripts exist for ownership checks and safe push sequencing under [`scripts/`](/Users/gap/finance-backoffice-report/scripts)

## Critical Implementation Rules

### Language-Specific Rules

- Keep code browser-compatible without bundler-only syntax or runtime assumptions
- Avoid introducing module imports or build-step dependencies unless the task explicitly migrates the architecture
- Use scoped functions or IIFEs for page initialization to avoid polluting `window`
- Prefer explicit null checks around DOM queries before attaching listeners

### Framework-Specific Rules

- This repo is not a React/Vue/Angular app; it is a static HTML/CSS/JS application
- Route behavior is controlled by direct file mapping and Vercel rewrites, not framework routing
- Shared navigation should continue to rely on `menu-component.js` and the existing sidebar/top-bar structure

### Testing Rules

- Playwright test suite is present (added commit `97c3f9a`) with 4 projects: `unit`, `component`, `api`, `e2e-chromium` (+ `e2e-webkit` / `e2e-firefox` when browsers are installed). Run `npm run test:p0` for the P0 gate, `npm run test:unit` / `:component` / `:api` for the faster tiers.
- All E2E tests mock the backend via `tests/fixtures/mock-backend.ts` — never let a test hit a real backend. If you add a new backend endpoint, route it there.
- After any backend URL or shared-library rename, update the mock fixture and `tests/README.md` alongside the code change.
- If auth, storage, or menu rendering changes, validate the affected page end to end in the browser AND add/update the corresponding Playwright spec.

### Code Quality & Style Rules

- Preserve semantic HTML and accessible controls over div-based substitutes
- Keep the mobile-first responsive behavior intact
- Maintain the current Thai-facing product tone in user-visible UI
- Keep files organized by page or feature basename so related HTML, CSS, and JS stay easy to find
- Respect the existing no-build structure; do not add unnecessary abstraction layers

### Development Workflow Rules

- Follow [`WORKFLOW.md`](/Users/gap/finance-backoffice-report/WORKFLOW.md): pull staging, branch, code, commit, push, PR, merge
- Use descriptive feature branch names that include module, change, and author
- Prefer syncing with staging before push to reduce conflicts
- Treat [`scripts/check-ownership.sh`](/Users/gap/finance-backoffice-report/scripts/check-ownership.sh) and [`scripts/safe-push.sh`](/Users/gap/finance-backoffice-report/scripts/safe-push.sh) as part of the implementation workflow
- Check ownership before editing shared or sensitive files

### Critical Don't-Miss Rules

- When adding or changing a route, update both [`server.js`](/Users/gap/finance-backoffice-report/server.js) and [`vercel.json`](/Users/gap/finance-backoffice-report/vercel.json)
- Preserve the auth bootstrap in [`index.html`](/Users/gap/finance-backoffice-report/index.html), including token capture, storage, URL cleanup, and redirect behavior for the `Gap` user
- Do not break sidebar collapse state or mobile menu handling, which rely on `localStorage` and shared classes
- Avoid changing shared menu rendering assumptions unless the task explicitly targets navigation
- `package.json` exists only to pin `@playwright/test` for the test suite; the production code still runs in the browser with no build step. Do not introduce runtime npm dependencies.
- Keep custom UI behavior compatible with direct file loading from the browser or the local static server

## Notes For AI Agents

- The repo is primarily a browser-oriented report backoffice, not a framework-based SPA
- If a task requires deeper architectural context, read the page file, its companion CSS/JS, and the related backend or API shim together
- When in doubt, preserve existing behavior and update the smallest route, page, or module surface that satisfies the change
