import * as dotenv from 'dotenv';

dotenv.config();

// ─── Config Schema ────────────────────────────────────────────────────────────

interface Config {
  /** Beeceptor endpoint that has the HTTP Callout rule configured */
  mainEndpointName: string;
  /** Beeceptor endpoint that acts as the callout receiver (sync tests) */
  receiverEndpointName: string;
  /** Base URL for all Beeceptor endpoints */
  beeceptorBaseUrl: string;
  /** Full URL for main endpoint */
  mainEndpointUrl: string;
  /** Full URL for receiver endpoint */
  receiverEndpointUrl: string;
  /** Webhook.site base URL */
  webhookSiteUrl: string;
  /**
   * Pre-configured webhook.site token UUID.
   * This is set ONCE in .env and also hardcoded as the callout target
   * in Beeceptor's async rule, since the Beeceptor UI doesn't support
   * dynamic target URLs without the paid Management API.
   */
  webhookSiteTokenUuid: string;
  /** Timeout for async callout polling (ms) */
  asyncCalloutTimeoutMs: number;
  /** Polling interval for async checks (ms) */
  pollingIntervalMs: number;
}

// ─── Build Config ─────────────────────────────────────────────────────────────

const mainEndpointName = process.env['MAIN_ENDPOINT_NAME'] ?? 'rahul-callout-main';
const receiverEndpointName = process.env['RECEIVER_ENDPOINT_NAME'] ?? 'rahul-callout-recv';
const beeceptorBaseUrl = process.env['BEECEPTOR_BASE_URL'] ?? 'https://free.beeceptor.com';

export const config: Config = {
  mainEndpointName,
  receiverEndpointName,
  beeceptorBaseUrl,
  mainEndpointUrl: `https://${mainEndpointName}.free.beeceptor.com`,
  receiverEndpointUrl: `https://${receiverEndpointName}.free.beeceptor.com`,
  webhookSiteUrl: 'https://webhook.site',
  // Set in .env — must match the callout target URL configured in Beeceptor UI
  webhookSiteTokenUuid: process.env['WEBHOOK_SITE_TOKEN'] ?? '1b812850-cb80-40b9-a7ae-b08eb88a9e55',
  asyncCalloutTimeoutMs: 15_000,
  pollingIntervalMs: 800,
};
