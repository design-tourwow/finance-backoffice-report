# CI/CD Workflows

## `test.yml` — Test Suite

Quality gate for the repository. Implements the 3-tier execution model from
`skills/test-artifacts/test-design-qa.md`.

### Triggers

| Trigger | Suite | Target time | Blocks merge? |
|---|---|---|---|
| `pull_request` to main | PR gate (unit + component + api + P0 E2E smoke) | < 5 min | ✅ YES |
| `push` to main | PR gate | < 5 min | — |
| Schedule `0 2 * * *` | Nightly full E2E (P0+P1+P2 × 3 browsers) | < 20 min | No |
| Schedule `0 3 * * 1` | Weekly (P3 + mobile) | < 45 min | No |
| `workflow_dispatch` | User-selected suite | varies | No |

### Jobs

1. **pr-gate** — Blocking: all P0 tests must pass (100%) before merge
2. **nightly** — Matrix across chromium/webkit/firefox; detects browser-specific regressions
3. **weekly** — Extended scope; best-effort; non-blocking
4. **quality-gate** — Aggregates PR gate result; fails fast if any P0 fails

### Caching

- `npm` dependencies cached via `actions/setup-node@v4` cache option
- Playwright browser binaries cached at `~/.cache/ms-playwright` keyed on `package-lock.json`

### Artifacts

- Failure artifacts (PR gate, nightly) retained 7-14 days
- Full HTML report + screenshots + traces uploaded on failure

### Manual trigger

From GitHub → Actions → Test Suite → Run workflow:
- `smoke` — fast PR gate scope
- `p0` / `p1` — priority-tagged subset
- `full` — everything except P3/mobile
- `weekly` — P3 + mobile

### Quality gates (from test-design-qa.md)

| Gate | Threshold | Enforcement |
|---|---|---|
| P0 pass rate | 100% | `pr-gate` job fails if any P0 test fails → blocks merge |
| P1 pass rate | ≥ 95% | Warn (nightly job reports but doesn't block) |
| P2 pass rate | ≥ 85% | Warn-only |
| Console errors in E2E | 0 allowed | Enforced in smoke test assertion |
| Flaky rate | < 2% over 20 runs | Tracked via nightly runs |

### Branch protection setup (manual — Gap to configure)

1. GitHub → Settings → Branches → Add rule for `main`
2. Require status check: `Quality Gate` (from this workflow)
3. Require pull request reviews before merge (at least 1)
4. Disable direct push to `main`

This ensures no merge without green PR gate.

### Related docs

- `skills/test-artifacts/test-design-architecture.md` — architectural test strategy
- `skills/test-artifacts/test-design-qa.md` — 35 test scenarios + priorities
- `skills/test-artifacts/automation-summary.md` — what each test file covers
- `tests/README.md` — how to run locally
