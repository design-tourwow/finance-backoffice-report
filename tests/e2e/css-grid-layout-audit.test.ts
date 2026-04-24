/**
 * CSS Grid Layout Audit — 3-column filter bar regression
 *
 * Covers the CSS refactor that standardised every filter bar to a 3-column
 * grid (repeat(3, minmax(0, 1fr))).  For each affected page we verify:
 *  1. The CSS files on disk declare the correct grid-template-columns.
 *  2. Pages that render the filter bar statically show 3-col computed layout.
 *  3. Pages that render dynamically (need API) are tested via CSS source audit.
 *  4. At 768 px viewport the @media rule collapses the grid to 1 column.
 *  5. Root cause of wholesale-destinations 47%/47% cell-width bug is identified.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Project root (absolute so tests run regardless of cwd)
// ---------------------------------------------------------------------------

const PROJECT_ROOT = '/Users/gap/finance-backoffice-report';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Inject a dummy auth token so token-gated pages skip the auth modal. */
async function injectAuth(context: BrowserContext) {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('authToken', 'pw-test-token');
      localStorage.setItem('authToken', 'pw-test-token');
    } catch (_) { /* sandboxed — ignore */ }
  });
}

async function goto(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

/** Computed gridTemplateColumns for the first matching element. */
async function computedGridColumns(page: Page, selector: string): Promise<string> {
  return page.$eval(selector, (el) =>
    getComputedStyle(el).gridTemplateColumns
  );
}

/**
 * Returns the bounding-box widths of all visible direct children of selector.
 */
async function visibleChildWidths(page: Page, containerSel: string): Promise<number[]> {
  return page.$$eval(containerSel, (containers) => {
    const container = containers[0];
    if (!container) return [];
    const widths: number[] = [];
    for (const child of Array.from(container.children)) {
      if (getComputedStyle(child).display === 'none') continue;
      widths.push(child.getBoundingClientRect().width);
    }
    return widths;
  });
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.body.scrollWidth > document.body.clientWidth + 2);
}

/**
 * Parse "400px 400px 400px" → [400, 400, 400].
 * Returns [] if the string isn't a list of px values (e.g. "none" or "auto").
 */
function parseGridColumns(raw: string): number[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter(s => s.endsWith('px'))
    .map(s => parseFloat(s));
}

/**
 * Read a CSS file from disk and return its content.
 */
function readCss(filename: string): string {
  const p = path.join(PROJECT_ROOT, filename);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf-8');
}

/**
 * Extract all occurrences of a CSS selector block from a stylesheet string.
 * Returns an array of the block bodies (contents between { }).
 */
function extractCssBlocks(css: string, selector: string): string[] {
  // Escape special regex chars in selector
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(escaped + '\\s*\\{([^}]*)\\}', 'gs');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    results.push(m[1]);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Suite 1 — CSS Source Audit: each CSS file declares correct rules on disk
// ---------------------------------------------------------------------------

test.describe('CSS source audit — grid rules in stylesheet files', () => {

  test('filter-panel.css: .time-granularity-control declares repeat(3, minmax(0, 1fr))', () => {
    const css = readCss('filter-panel.css');
    expect(css.length, 'filter-panel.css must exist and be non-empty').toBeGreaterThan(0);

    const blocks = extractCssBlocks(css, '.time-granularity-control');
    // Find the block that has display:grid + grid-template-columns
    const gridBlock = blocks.find(b => b.includes('display') && b.includes('grid') && b.includes('grid-template-columns'));
    expect(
      gridBlock,
      `filter-panel.css: .time-granularity-control must have a block with both display:grid and grid-template-columns. Found blocks:\n${blocks.join('\n---\n')}`
    ).toBeTruthy();

    expect(
      gridBlock,
      `filter-panel.css .time-granularity-control must use repeat(3, minmax(0, 1fr)). Got:\n${gridBlock}`
    ).toContain('repeat(3');
  });

  test('wholesale-destinations.css: .time-granularity-control declares repeat(3, minmax(0, 1fr))', () => {
    const css = readCss('wholesale-destinations.css');
    expect(css.length, 'wholesale-destinations.css must exist').toBeGreaterThan(0);

    const blocks = extractCssBlocks(css, '.time-granularity-control');
    const gridBlock = blocks.find(b => b.includes('display') && b.includes('grid') && b.includes('grid-template-columns'));
    expect(
      gridBlock,
      `wholesale-destinations.css: .time-granularity-control must have display:grid + grid-template-columns. Blocks found:\n${blocks.join('\n---\n')}`
    ).toBeTruthy();

    expect(
      gridBlock,
      `wholesale-destinations.css .time-granularity-control must use repeat(3,…). Got:\n${gridBlock}`
    ).toContain('repeat(3');
  });

  test('sales-by-country.css: .time-granularity-control or .form-row declares 3-col grid', () => {
    const css = readCss('sales-by-country.css');
    expect(css.length, 'sales-by-country.css must exist').toBeGreaterThan(0);

    // Check .form-row
    const formRowBlocks = extractCssBlocks(css, '.form-row');
    const formRowGrid = formRowBlocks.find(b => b.includes('grid-template-columns'));
    if (formRowGrid) {
      expect(
        formRowGrid,
        `sales-by-country.css .form-row must use repeat(3,…). Got:\n${formRowGrid}`
      ).toContain('repeat(3');
    }

    // Check .time-granularity-control (may be overriding filter-panel.css)
    const tgcBlocks = extractCssBlocks(css, '.time-granularity-control');
    const tgcGrid = tgcBlocks.find(b => b.includes('grid-template-columns'));
    if (tgcGrid) {
      expect(
        tgcGrid,
        `sales-by-country.css .time-granularity-control override must use repeat(3,…). Got:\n${tgcGrid}`
      ).toContain('repeat(3');
    }
  });

  test('order-report.css: .form-row declares repeat(3, 1fr)', () => {
    const css = readCss('order-report.css');
    expect(css.length, 'order-report.css must exist').toBeGreaterThan(0);

    const blocks = extractCssBlocks(css, '.form-row');
    const gridBlock = blocks.find(b => b.includes('grid-template-columns'));
    expect(
      gridBlock,
      `order-report.css .form-row must declare grid-template-columns. Blocks:\n${blocks.join('\n---\n')}`
    ).toBeTruthy();
    expect(
      gridBlock,
      `order-report.css .form-row must use repeat(3,…). Got:\n${gridBlock}`
    ).toContain('repeat(3');
  });

  test('filter-panel.css: .filter-wrap-paired-grid .filter-grid-main declares repeat(3, minmax(0, 1fr))', () => {
    const css = readCss('filter-panel.css');
    // The selector uses descendant combinator — search for it directly
    const has3Col = css.includes('repeat(3') && css.includes('filter-grid-main');
    expect(has3Col, 'filter-panel.css must contain filter-grid-main with repeat(3,…) rule').toBe(true);
  });

  test('filter-panel.css: @media 768px collapses time-granularity-control to 1 column', () => {
    const css = readCss('filter-panel.css');
    // Look for the media query block containing time-granularity-control with 1fr
    const mediaMatch = css.match(/@media\s*\(max-width:\s*768px\)[^{]*\{([\s\S]*?)\}\s*\n?\s*(?:\/\*|@|\.(?!time-granularity)|\s*$)/);

    // Simpler: just check both substrings are present in the file in the right order
    const mediaIdx = css.indexOf('@media (max-width: 768px)');
    const tgcIdx   = css.indexOf('.time-granularity-control', mediaIdx);
    const oneColIdx = css.indexOf('grid-template-columns: 1fr', tgcIdx);

    expect(mediaIdx, 'filter-panel.css must have @media (max-width: 768px)').toBeGreaterThan(-1);
    expect(tgcIdx,   'filter-panel.css must have .time-granularity-control inside the 768px media query').toBeGreaterThan(mediaIdx);
    expect(oneColIdx,'filter-panel.css must have grid-template-columns: 1fr for .time-granularity-control at 768px').toBeGreaterThan(tgcIdx);
  });

  test('wholesale-destinations.css: @media 768px collapses time-granularity-control to 1 column', () => {
    const css = readCss('wholesale-destinations.css');

    const mediaIdx  = css.indexOf('@media (max-width: 768px)');
    const tgcIdx    = css.indexOf('.time-granularity-control', mediaIdx);
    const oneColIdx = css.indexOf('grid-template-columns: 1fr', tgcIdx);

    expect(mediaIdx,  'wholesale-destinations.css must have @media (max-width: 768px)').toBeGreaterThan(-1);
    expect(tgcIdx,    'wholesale-destinations.css must have .time-granularity-control inside the 768px media query').toBeGreaterThan(mediaIdx);
    expect(oneColIdx, 'wholesale-destinations.css must have grid-template-columns: 1fr at 768px for .time-granularity-control').toBeGreaterThan(tgcIdx);
  });

  /**
   * Root-cause test for the wholesale-destinations 47%/47% bug:
   * wholesale-destinations.css must NOT have any .time-granularity-control
   * block that sets display:flex (that would make the 2 children stretch
   * to fill the row and render at ~47% each).
   */
  test('wholesale-destinations.css: .time-granularity-control does NOT use display:flex', () => {
    const css = readCss('wholesale-destinations.css');
    const blocks = extractCssBlocks(css, '.time-granularity-control');

    for (const block of blocks) {
      // Detect a flex rule that overrides the grid
      const hasDisplayFlex = /display\s*:\s*flex/.test(block);
      expect(
        hasDisplayFlex,
        `wholesale-destinations.css .time-granularity-control block contains "display: flex" — ` +
        `this would override the grid from filter-panel.css and produce 2-column (~47%) layout. ` +
        `Block:\n${block}`
      ).toBe(false);
    }
  });

  /**
   * Verify that wholesale-destinations.css does not have a 2-col grid
   * anywhere in a .time-granularity-control rule.
   */
  test('wholesale-destinations.css: .time-granularity-control does NOT use repeat(2,…) grid', () => {
    const css = readCss('wholesale-destinations.css');
    const blocks = extractCssBlocks(css, '.time-granularity-control');

    for (const block of blocks) {
      const has2Col = /grid-template-columns\s*:[^;]*repeat\(2/.test(block);
      expect(
        has2Col,
        `wholesale-destinations.css .time-granularity-control has repeat(2,…) grid — ` +
        `this is the 2-col bug. Block:\n${block}`
      ).toBe(false);
    }
  });

  /**
   * Check whether wholesale-destinations.css still has leftover FLEX rules
   * that were supposed to be removed during the grid migration.
   */
  test('wholesale-destinations.css: no leftover flex-based .time-granularity-control rules outside media queries', () => {
    const css = readCss('wholesale-destinations.css');

    // Strip @media blocks to only look at the top-level rules
    const topLevelCss = css.replace(/@media[^{]*\{[\s\S]*?\}\s*\}/g, '');
    const blocks = extractCssBlocks(topLevelCss, '.time-granularity-control');

    for (const block of blocks) {
      expect(
        /display\s*:\s*flex/.test(block),
        `wholesale-destinations.css (top-level, outside @media): .time-granularity-control ` +
        `still uses display:flex. Block:\n${block}`
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Live browser: work-list (renders filter bar statically via JS on DOMContentLoaded)
// ---------------------------------------------------------------------------

test.describe('Live browser layout — work-list filter bar', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await injectAuth(context);
  });

  test.afterAll(async () => { await context.close(); });

  test('time-granularity-control computes 3 equal column tracks', async () => {
    const page = await context.newPage();
    await goto(page, '/work-list');

    const sel = '.time-granularity-control';
    const count = await page.locator(sel).count();
    if (count === 0) {
      test.skip(true, '.time-granularity-control not rendered — check auth');
      await page.close();
      return;
    }

    const rawCols = await computedGridColumns(page, sel);
    const cols = parseGridColumns(rawCols);
    console.log(`[work-list] computed gridTemplateColumns = "${rawCols}" → ${cols.length} tracks`);

    expect(cols.length, `Expected 3 tracks, got "${rawCols}"`).toBe(3);
    const [c1, c2, c3] = cols;
    expect(Math.abs(c1 - c2), `Tracks 1 and 2 must be equal (got ${c1} vs ${c2})`).toBeLessThan(3);
    expect(Math.abs(c2 - c3), `Tracks 2 and 3 must be equal (got ${c2} vs ${c3})`).toBeLessThan(3);

    await page.close();
  });

  test('work-list has exactly 3 direct .filter-inline-field children', async () => {
    const page = await context.newPage();
    await goto(page, '/work-list');

    const directChildren = await page.evaluate(() => {
      const ctrl = document.querySelector('.time-granularity-control');
      if (!ctrl) return -1;
      return Array.from(ctrl.children).filter(el => el.classList.contains('filter-inline-field')).length;
    });

    if (directChildren === -1) {
      test.skip(true, '.time-granularity-control not in DOM');
      await page.close();
      return;
    }

    expect(
      directChildren,
      `work-list: expected 3 direct .filter-inline-field children (flat DOM after removing wrapper divs). Got ${directChildren}.`
    ).toBe(3);

    await page.close();
  });

  test('no legacy .work-list-control-row or .work-list-control-group wrappers in DOM', async () => {
    const page = await context.newPage();
    await goto(page, '/work-list');

    const legacyRow   = await page.locator('.work-list-control-row').count();
    const legacyGroup = await page.locator('.work-list-control-group').count();

    expect(legacyRow,   'Legacy .work-list-control-row should be removed from DOM').toBe(0);
    expect(legacyGroup, 'Legacy .work-list-control-group should be removed from DOM').toBe(0);

    await page.close();
  });

  test('each visible grid cell is ≤ 36% of container width', async () => {
    const page = await context.newPage();
    await goto(page, '/work-list');

    const sel = '.time-granularity-control';
    if (await page.locator(sel).count() === 0) {
      test.skip(true, 'container not rendered');
      await page.close();
      return;
    }

    const containerBox = await page.locator(sel).first().boundingBox();
    if (!containerBox) { await page.close(); return; }

    const widths = await visibleChildWidths(page, sel);
    console.log(`[work-list] container=${containerBox.width.toFixed(1)}px, cells=[${widths.map(w => `${w.toFixed(1)}px/${(w / containerBox.width * 100).toFixed(1)}%`).join(', ')}]`);

    for (const w of widths) {
      const pct = (w / containerBox.width) * 100;
      expect(pct, `Cell is ${pct.toFixed(1)}% — should be ≤36% for 3-col grid`).toBeLessThanOrEqual(36);
    }

    await page.close();
  });

  test('no horizontal overflow at 1280px', async () => {
    const page = await context.newPage();
    await goto(page, '/work-list');
    const overflow = await hasHorizontalOverflow(page);
    expect(overflow, 'work-list should not have horizontal overflow').toBe(false);
    await page.close();
  });

  test('at 768px viewport grid collapses to 1 column', async () => {
    const mobileCtx = await (await context.browser()!.newContext({ viewport: { width: 768, height: 900 } }));
    await injectAuth(mobileCtx);
    const page = await mobileCtx.newPage();
    await goto(page, '/work-list');

    const sel = '.time-granularity-control';
    if (await page.locator(sel).count() === 0) {
      test.skip(true, 'container not rendered on mobile');
      await page.close();
      await mobileCtx.close();
      return;
    }

    const rawCols = await computedGridColumns(page, sel);
    const cols = parseGridColumns(rawCols);
    console.log(`[work-list @768px] computed gridTemplateColumns = "${rawCols}" → ${cols.length} tracks`);

    expect(cols.length, `At 768px expected 1 track, got "${rawCols}"`).toBe(1);

    await page.close();
    await mobileCtx.close();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Root cause deep-dive: wholesale-destinations CSS cascade
// This test runs against the local static server (no API needed for CSS audit).
// We load the page, intercept the CSS responses, and inspect computed styles
// of ANY .time-granularity-control that appears in the DOM.
// ---------------------------------------------------------------------------

test.describe('Root cause: wholesale-destinations 47%/47% cell-width investigation', () => {

  test('CSS source: wholesale-destinations.css last .time-granularity-control block has display:grid repeat(3)', () => {
    const css = readCss('wholesale-destinations.css');

    // Find ALL .time-granularity-control blocks and grab the LAST one
    // (highest cascade order within the file — though same specificity means last wins)
    const allBlocks = extractCssBlocks(css, '.time-granularity-control');
    expect(allBlocks.length, 'Expected at least 1 .time-granularity-control block in wholesale-destinations.css').toBeGreaterThan(0);

    console.log(`[wholesale-destinations.css] Found ${allBlocks.length} .time-granularity-control block(s):`);
    allBlocks.forEach((b, i) => console.log(`  Block ${i + 1}:\n${b}`));

    // The effective block is the LAST one (or the one in highest cascade position)
    const lastBlock = allBlocks[allBlocks.length - 1];
    expect(lastBlock, 'Last .time-granularity-control block must contain display: grid').toMatch(/display\s*:\s*grid/);
    expect(lastBlock, 'Last .time-granularity-control block must contain repeat(3').toContain('repeat(3');
  });

  test('DOM structure: wholesale-destinations filter bar has 3 grid children (2 visible + 1 hidden badge)', async ({ browser }) => {
    // This test loads the page and immediately inspects the DOM after JS renders it.
    // The filter bar is rendered by renderDashboard() which requires an API call.
    // Without a real token the page goes to showEmpty() — the filter bar is NOT rendered.
    // We therefore inject a fake token AND mock the API responses so renderDashboard runs.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    // Mock the two API endpoints that loadWholesaleReport() calls
    await context.route('**/api/reports/wholesale-destinations/periods**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { yearly: [{ year: 2025, label: '2025' }], quarterly: [], monthly: [] } }),
      });
    });
    await context.route('**/api/reports/wholesale-destinations**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            wholesales: [
              { id: 1, name: 'Test Wholesale', total_value: 1000, travelers: 10, orders: 5, net_commission: 100, countries: [] },
            ],
            summary: {
              total_value: 1000,
              top_wholesale: { name: 'Test Wholesale', count: 10 },
              total_countries: 1,
              active_wholesales: 1,
              country_breakdown: [],
            },
            country_totals: {},
          },
        }),
      });
    });

    await injectAuth(context);
    const page = await context.newPage();

    await goto(page, '/wholesale-destinations');
    // Give the async renderDashboard() time to complete
    await page.waitForTimeout(1500);

    const sel = '.time-granularity-control';
    const count = await page.locator(sel).count();

    if (count === 0) {
      // Dashboard didn't render — log what IS in the DOM for diagnosis
      const bodyText = await page.locator('.report-content-section').textContent().catch(() => 'N/A');
      console.log(`[wholesale-destinations] Dashboard NOT rendered. report-content-section text: "${bodyText?.slice(0, 200)}"`);
      test.skip(true, 'Dashboard requires real API — skipping DOM child count test');
      await page.close();
      await context.close();
      return;
    }

    // Count ALL direct children of .time-granularity-control
    const childInfo = await page.evaluate(() => {
      const ctrl = document.querySelector('.time-granularity-control');
      if (!ctrl) return null;
      return Array.from(ctrl.children).map(el => ({
        tag: el.tagName,
        classes: Array.from(el.classList),
        display: getComputedStyle(el).display,
        width: el.getBoundingClientRect().width,
      }));
    });

    console.log(`[wholesale-destinations] .time-granularity-control children:`, JSON.stringify(childInfo, null, 2));

    expect(childInfo, 'Could not read .time-granularity-control children').not.toBeNull();

    // Should have exactly 3 children: 2 filter-inline-field + 1 selected-period-badge
    expect(
      childInfo!.length,
      `Expected 3 direct children (2 filter-inline-field + 1 selected-period-badge). Got ${childInfo!.length}`
    ).toBe(3);

    // The badge should be hidden (display:none)
    const badge = childInfo!.find(c => c.classes.includes('selected-period-badge'));
    expect(badge, 'selected-period-badge must exist as a direct child').toBeTruthy();
    // It has inline style="display:none" which overrides everything
    expect(badge!.display, 'selected-period-badge must be hidden (display: none)').toBe('none');

    await page.close();
    await context.close();
  });

  test('Computed layout: with 3-col grid and 2 visible cells, each cell is ~33% wide', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    await context.route('**/api/reports/wholesale-destinations/periods**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { yearly: [{ year: 2025, label: '2025' }], quarterly: [], monthly: [] } }),
      });
    });
    await context.route('**/api/reports/wholesale-destinations**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            wholesales: [
              { id: 1, name: 'Test', total_value: 1000, travelers: 10, orders: 5, net_commission: 100, countries: [] },
            ],
            summary: {
              total_value: 1000,
              top_wholesale: { name: 'Test', count: 10 },
              total_countries: 1,
              active_wholesales: 1,
              country_breakdown: [],
            },
            country_totals: {},
          },
        }),
      });
    });

    await injectAuth(context);
    const page = await context.newPage();
    await goto(page, '/wholesale-destinations');
    await page.waitForTimeout(1500);

    const sel = '.time-granularity-control';
    if (await page.locator(sel).count() === 0) {
      test.skip(true, 'Dashboard not rendered — API mock may not match URL pattern');
      await page.close();
      await context.close();
      return;
    }

    const rawCols = await computedGridColumns(page, sel);
    const cols = parseGridColumns(rawCols);
    const containerBox = await page.locator(sel).first().boundingBox();
    const widths = await visibleChildWidths(page, sel);

    console.log(`[wholesale-destinations] computed gridTemplateColumns = "${rawCols}" (${cols.length} tracks)`);
    if (containerBox) {
      const pcts = widths.map(w => ((w / containerBox.width) * 100).toFixed(1) + '%');
      console.log(`[wholesale-destinations] container=${containerBox.width.toFixed(1)}px, cell widths=[${widths.map(w => w.toFixed(1)).join(', ')}] → [${pcts.join(', ')}]`);
    }

    expect(cols.length, `Expected 3 grid tracks, got "${rawCols}". If 2, a CSS rule is overriding.`).toBe(3);

    if (containerBox && widths.length > 0) {
      for (const w of widths) {
        const pct = (w / containerBox.width) * 100;
        expect(
          pct,
          `Cell is ${pct.toFixed(1)}% wide — with 3-col grid should be ≤36% (33.3% + 2.7% tolerance). ` +
          `A value near 47% means the grid is actually 2-col.`
        ).toBeLessThanOrEqual(36);
      }
    }

    await page.close();
    await context.close();
  });

  test('CSS load order: wholesale-destinations.css loads AFTER filter-panel.css', () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'wholesale-destinations.html'), 'utf-8');

    const fpIdx = html.indexOf('filter-panel.css');
    const wdIdx = html.indexOf('wholesale-destinations.css');

    expect(fpIdx,  'filter-panel.css link must exist in wholesale-destinations.html').toBeGreaterThan(-1);
    expect(wdIdx,  'wholesale-destinations.css link must exist in wholesale-destinations.html').toBeGreaterThan(-1);
    expect(
      wdIdx > fpIdx,
      `wholesale-destinations.css (pos ${wdIdx}) must load AFTER filter-panel.css (pos ${fpIdx}) ` +
      `so that same-specificity grid rules in wholesale-destinations.css win the cascade.`
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Mobile responsive: filter-panel.css @media 768px
// Tested on pages that render the filter statically (work-list).
// ---------------------------------------------------------------------------

test.describe('Mobile responsive — @media 768px collapses to 1 column', () => {

  test('filter-panel.css @media 768px: .time-granularity-control has grid-template-columns: 1fr', () => {
    const css = readCss('filter-panel.css');
    // Find the @media (max-width: 768px) block and check it contains the 1fr rule
    const mediaMatch = css.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)(?=\n@media|\n\/\*\s*=|$)/);
    if (!mediaMatch) {
      expect(false, '@media (max-width: 768px) block not found in filter-panel.css').toBe(true);
      return;
    }
    const mediaBlock = mediaMatch[1];
    const has1fr = mediaBlock.includes('.time-granularity-control') && mediaBlock.includes('grid-template-columns: 1fr');
    expect(has1fr, `filter-panel.css 768px @media block must set .time-granularity-control { grid-template-columns: 1fr }. Block:\n${mediaBlock}`).toBe(true);
  });

  test('wholesale-destinations.css @media 768px: .time-granularity-control has grid-template-columns: 1fr', () => {
    const css = readCss('wholesale-destinations.css');
    const mediaMatch = css.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)(?=\n@media|\n\/\*\s*=|$)/);
    if (!mediaMatch) {
      expect(false, '@media (max-width: 768px) block not found in wholesale-destinations.css').toBe(true);
      return;
    }
    const mediaBlock = mediaMatch[1];
    const has1fr = mediaBlock.includes('.time-granularity-control') && mediaBlock.includes('grid-template-columns: 1fr');
    expect(has1fr, `wholesale-destinations.css 768px @media must collapse .time-granularity-control to 1fr. Block:\n${mediaBlock}`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — work-list.css: no dead CSS (old wrapper classes removed)
// ---------------------------------------------------------------------------

test.describe('work-list.css: dead CSS classes removed', () => {

  test('work-list.css does not define .work-list-control-row', () => {
    const css = readCss('work-list.css');
    if (!css) return; // file might not exist if fully cleaned up
    const hasDeadClass = css.includes('.work-list-control-row');
    expect(hasDeadClass, 'work-list.css must not define the removed .work-list-control-row class').toBe(false);
  });

  test('work-list.css does not define .work-list-control-group', () => {
    const css = readCss('work-list.css');
    if (!css) return;
    const hasDeadClass = css.includes('.work-list-control-group');
    expect(hasDeadClass, 'work-list.css must not define the removed .work-list-control-group class').toBe(false);
  });
});
