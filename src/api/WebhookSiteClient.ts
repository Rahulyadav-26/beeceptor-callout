import type { APIRequestContext } from '@playwright/test';
import { withRetry } from '../utils/retry';
import { poll } from '../utils/polling';
import type {
  WebhookSiteToken,
  WebhookSiteRequest,
  WebhookSiteRequestList,
} from '../types/webhook-site.types';

// ─── Webhook.site Client ──────────────────────────────────────────────────────

/**
 * Client for webhook.site — used as the async callout receiver.
 *
 * WHY webhook.site?
 * Beeceptor's request history API requires a paid plan (Team/Enterprise).
 * webhook.site provides a free, queryable HTTP receiver with a REST API,
 * making it perfect for verifying async (fire-and-forget) callouts.
 *
 * Flow:
 *   1. createToken()  → get a unique URL (e.g. https://webhook.site/abc-123)
 *   2. Configure Beeceptor async rule to callout to that URL
 *   3. Trigger the callout
 *   4. waitForRequest() → polls until callout arrives (or times out)
 */
export class WebhookSiteClient {
  private readonly baseUrl = 'https://webhook.site';

  constructor(private readonly request: APIRequestContext) {}

  // ─── Token Management ─────────────────────────────────────────────────────

  /**
   * Creates a new webhook.site token (unique receiving URL).
   * Each test suite gets its own token for isolation.
   */
  async createToken(): Promise<WebhookSiteToken> {
    return withRetry(
      async () => {
        const response = await this.request.post(`${this.baseUrl}/token`, {
          headers: { 'Content-Type': 'application/json' },
          data: { default_status: 200, default_content: 'OK', cors: true },
        });

        if (!response.ok()) {
          throw new Error(`webhook.site token creation failed: ${response.status()}`);
        }

        return response.json() as Promise<WebhookSiteToken>;
      },
      { retries: 3, baseDelayMs: 500, label: 'webhook.site createToken' }
    );
  }

  /**
   * Returns the public webhook URL for a token.
   * Configure Beeceptor callout target to this URL.
   */
  getWebhookUrl(token: WebhookSiteToken): string {
    return `${this.baseUrl}/${token.uuid}`;
  }

  // ─── Request Inspection ───────────────────────────────────────────────────

  /**
   * Fetches all requests received by a webhook token.
   */
  async getRequests(tokenUuid: string): Promise<WebhookSiteRequest[]> {
    const response = await this.request.get(
      `${this.baseUrl}/token/${tokenUuid}/requests`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok()) {
      throw new Error(`Failed to fetch webhook requests: ${response.status()}`);
    }

    const body = await response.json() as WebhookSiteRequestList;
    return body.data;
  }

  /**
   * Finds a specific request in the webhook history using a matcher function.
   * Returns null if no match found (used with poll() utility).
   */
  async findRequest(
    tokenUuid: string,
    matcher: (req: WebhookSiteRequest) => boolean
  ): Promise<WebhookSiteRequest | null> {
    const requests = await this.getRequests(tokenUuid);
    return requests.find(matcher) ?? null;
  }

  // ─── Async Verification ───────────────────────────────────────────────────

  /**
   * Polls webhook.site until a matching request arrives or times out.
   *
   * This is the KEY method for verifying async (fire-and-forget) callouts:
   * after Beeceptor returns 202 to the client, the actual callout happens
   * in the background — this polls until it arrives.
   *
   * @param tokenUuid - The webhook.site token to poll
   * @param matcher   - Predicate to identify the expected callout request
   * @param timeoutMs - Maximum wait time (default: 15s)
   */
  async waitForRequest(
    tokenUuid: string,
    matcher: (req: WebhookSiteRequest) => boolean,
    timeoutMs = 15_000
  ): Promise<WebhookSiteRequest> {
    return poll(
      () => this.findRequest(tokenUuid, matcher),
      {
        timeoutMs,
        intervalMs: 800,
        label: `callout to webhook.site token ${tokenUuid.slice(0, 8)}...`,
      }
    );
  }

  /**
   * Counts total requests received by a token.
   * Used in idempotency / concurrent tests.
   */
  async countRequests(tokenUuid: string): Promise<number> {
    const requests = await this.getRequests(tokenUuid);
    return requests.length;
  }

  /**
   * Deletes all requests for a token (cleanup between tests).
   */
  async deleteRequests(tokenUuid: string): Promise<void> {
    await this.request.delete(`${this.baseUrl}/token/${tokenUuid}/requests`);
  }
}
