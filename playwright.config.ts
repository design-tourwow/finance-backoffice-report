import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'unit', testDir: './tests/unit', testMatch: /.*\.test\.ts/ },
    { name: 'component', testDir: './tests/component', testMatch: /.*\.test\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'api', testDir: './tests/api', testMatch: /.*\.test\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'e2e-chromium', testDir: './tests/e2e', testMatch: /.*\.test\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'e2e-webkit', testDir: './tests/e2e', testMatch: /.*\.test\.ts/, use: { ...devices['Desktop Safari'] } },
    { name: 'e2e-firefox', testDir: './tests/e2e', testMatch: /.*\.test\.ts/, use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'node server.js',
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
