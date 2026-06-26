import { test as base } from '@playwright/test';
import { config } from '../config';

// ─── Fixture Types ────────────────────────────────────────────────────────────

export interface BeeceptorFixtures {
  /** Full URL for the main Beeceptor endpoint (has callout rules) */
  mainEndpointUrl: string;
  /** Full URL for the receiver Beeceptor endpoint */
  receiverEndpointUrl: string;
}

// ─── Extended Test ────────────────────────────────────────────────────────────

/**
 * Custom Playwright test with Beeceptor fixtures pre-wired.
 *
 * Provides endpoint URLs from config so tests don't hardcode them.
 * Async verification uses WebhookSiteClient with a pre-configured
 * token UUID (set once in .env, matching the Beeceptor callout target URL).
 *
 * Usage:
 *   import { test, expect } from '../src/fixtures/beeceptor.fixture';
 *   test('my test', async ({ mainEndpointUrl, request }) => { ... })
 */
export const test = base.extend<BeeceptorFixtures>({

  mainEndpointUrl: async ({}, use) => {
    await use(config.mainEndpointUrl);
  },

  receiverEndpointUrl: async ({}, use) => {
    await use(config.receiverEndpointUrl);
  },
});

export { expect } from '@playwright/test';
