import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',

  // ─── Execution ──────────────────────────────────────────────────────────
  // Sequential to avoid Beeceptor free-plan rate limits (50 req/day per endpoint)
  fullyParallel: false,
  workers: 1,

  // Retry flaky tests in CI (network-dependent tests can be flaky)
  retries: process.env['CI'] ? 2 : 0,

  // Fail CI if test.only() is accidentally committed
  forbidOnly: !!process.env['CI'],

  // Per-test timeout (includes webhook.site polling for async tests)
  timeout: 45_000,

  // ─── Artifacts ──────────────────────────────────────────────────────────
  use: {
    // Capture trace only on first retry (saves storage, helps debug flakes)
    trace: 'on-first-retry',
    // Screenshot only on failure (attached to HTML report)
    screenshot: 'only-on-failure',
    // Video only on failure (attached to HTML report)
    video: 'retain-on-failure',
    // All API requests use JSON
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  // ─── Reporters ──────────────────────────────────────────────────────────
  reporter: [
    // Console output during run
    ['list', { printSteps: true }],
    // HTML report (open with: npx playwright show-report)
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    // JSON for CI parsing
    ['json', { outputFile: 'test-results/results.json' }],
    // GitHub Actions annotations
    ...(process.env['CI'] ? [['github'] as ['github']] : []),
  ],

  // ─── Projects ───────────────────────────────────────────────────────────
  projects: [
    {
      name: 'sync-callout',
      testMatch: 'tests/sync-callout.spec.ts',
    },
    {
      name: 'async-callout',
      testMatch: 'tests/async-callout.spec.ts',
    },
    {
      name: 'negative',
      testMatch: 'tests/negative.spec.ts',
    },
    {
      name: 'edge-cases',
      testMatch: 'tests/edge-cases.spec.ts',
    },
  ],

  // ─── Output ─────────────────────────────────────────────────────────────
  outputDir: 'test-results/',
});
