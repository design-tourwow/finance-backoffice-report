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
- Shared modules are plain scripts, not imports, and are typically named by concern, such as `menu-component.js`, `date-picker-component.js`, `filter-sort-dropdown-component.js`, and `period-filter-component.js`
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

- There is no formal unit-test framework in the repo snapshot, so verify changes through browser behavior and the existing local server flow
- Check route behavior locally when modifying navigation, rewrites, or page entry points
- If auth, storage, or menu rendering changes, validate the affected page end to end in the browser

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
- Do not assume npm-based tooling exists; there is no package manifest in this repo
- Keep custom UI behavior compatible with direct file loading from the browser or the local static server

## Notes For AI Agents

- The repo is primarily a browser-oriented report backoffice, not a framework-based SPA
- If a task requires deeper architectural context, read the page file, its companion CSS/JS, and the related backend or API shim together
- When in doubt, preserve existing behavior and update the smallest route, page, or module surface that satisfies the change
