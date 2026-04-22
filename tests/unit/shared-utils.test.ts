import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Unit test sample (U1, U2). Loads shared-utils.js into a sandboxed scope and
 * exercises pure helpers.
 *
 * Pattern: each unit test evaluates shared-utils.js in a fake-window shim;
 * assertions run in Node. No browser required.
 */

function loadSharedUtils(): Record<string, any> {
  const src = readFileSync(path.join(__dirname, '..', '..', 'shared-utils.js'), 'utf-8');
  const win: any = {};
  const fn = new Function('window', src);
  fn(win);
  return win.SharedUtils;
}

test.describe('@p1 SharedUtils', () => {
  test('U1 formatCurrency — Thai locale, integer, negative, zero', () => {
    const U = loadSharedUtils();
    expect(U.formatCurrency(1234567)).toMatch(/1,234,567/);
    expect(U.formatCurrency(0)).toBe('0');
    expect(U.formatCurrency(-1500)).toMatch(/-1,500|−1,500/);
  });

  test('U2 formatDateTH — Buddhist year +543', () => {
    const U = loadSharedUtils();
    expect(U.formatDateTH('2024-04-01')).toBe('01/04/2567');
    expect(U.formatDateTH('2026-12-31')).toBe('31/12/2569');
  });

  test('@p2 U3 sortCountriesByThai — returns sorted copy, no mutation', () => {
    const U = loadSharedUtils();
    const input = [
      { id: 2, name_th: 'ญี่ปุ่น' },
      { id: 1, name_th: 'เกาหลี' },
      { id: 3, name_th: 'จีน' },
    ];
    const sorted = U.sortCountriesByThai(input);
    expect(sorted.map((c: any) => c.name_th)).toEqual(['เกาหลี', 'จีน', 'ญี่ปุ่น']);
    expect(input[0].name_th).toBe('ญี่ปุ่น');
  });

  test('@p2 U4 filterAndDisplayJobPositions — keeps ts/crm only (match by job_position)', () => {
    const U = loadSharedUtils();
    const positions = [
      { job_position: 'ts' },
      { job_position: 'crm' },
      { job_position: 'admin' },
      { job_position: 'manager' },
    ];
    const filtered = U.filterAndDisplayJobPositions(positions);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((p: any) => p.job_position).sort()).toEqual(['crm', 'ts']);
    // display_name added
    expect(filtered[0].display_name).toBeDefined();
  });

  test('@p2 U5 getYearOptions — current year first, 5 entries', () => {
    const U = loadSharedUtils();
    const years = U.getYearOptions();
    const currentYear = new Date().getFullYear();
    expect(years.length).toBeGreaterThanOrEqual(5);
    expect(years[0]).toBe(currentYear);
  });

  test('@p2 U5 getMonthOptions — 12 entries with Thai labels', () => {
    const U = loadSharedUtils();
    const months = U.getMonthOptions();
    expect(months).toHaveLength(12);
    expect(months[0]).toHaveProperty('value', 1);
    expect(months[0].label).toMatch(/มกราคม|มค\.|ม\.ค/);
  });

  test('@p2 U5 getQuarterOptions — 4 entries, current labelled', () => {
    const U = loadSharedUtils();
    const quarters = U.getQuarterOptions();
    expect(quarters).toHaveLength(4);
    expect(quarters[0].label).toContain('Current');
  });
});
