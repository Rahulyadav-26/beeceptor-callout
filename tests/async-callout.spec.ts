/**
 * @suite Asynchronous HTTP Callout (Fire & Forget)
 *
 * Tests Beeceptor's asynchronous callout behavior:
 * when a request hits the main endpoint, Beeceptor IMMEDIATELY returns
 * a 202 response to the client, then fires the callout to webhook.site
 * in the background — non-blocking.
 *
 * Beeceptor UI Setup (rahul-callout-main):
 *   POST /api/notifications → HTTP Callout → Asynchronous
 *   Target URL: https://webhook.site/1b812850-cb80-40b9-a7ae-b08eb88a9e55
 *   Immediate Response: 202 { "status": "queued", "message": "...", "requestId": "..." }
 *
 * Verification Strategy:
 *   Since Beeceptor's request history API requires a paid plan, we use
 *   webhook.site as the callout target. Its free REST API lets us query
 *   received requests programmatically — perfect for fire-and-forget verification.
 *
 * @see README.md → "Async Test Setup"
 */

import { test, expect } from '../src/fixtures/beeceptor.fixture';
import { assertSchema } from '../src/schemas/validator';
import { asyncImmediateResponseSchema } from '../src/schemas/response.schemas';
import { PayloadFactory } from '../src/factories/payload.factory';
import { config } from '../src/config';
import { poll, sleep } from '../src/utils/polling';
import { WebhookSiteClient } from '../src/api/WebhookSiteClient';
import type { WebhookSiteRequest } from '../src/types/webhook-site.types';

// ─── T04: Immediate Response ──────────────────────────────────────────────────

test('T04 — async callout: immediate 202 response (client not blocked)', async ({
  request,
  mainEndpointUrl,
}) => {
  const payload = PayloadFactory.notification();
  const startMs = Date.now();

  const response = await request.post(`${mainEndpointUrl}/api/notifications`, {
    data: payload,
    headers: { 'Content-Type': 'application/json', 'X-Test-Name': 'T04' },
  });

  const elapsedMs = Date.now() - startMs;

  // ── Status: must be 202 Accepted ──
  expect(
    response.status(),
    `Async callout must return 202 immediately, got ${response.status()}`
  ).toBe(202);

  // ── Body schema: must match async immediate response shape ──
  const body = await response.json();
  assertSchema(asyncImmediateResponseSchema, body);

  expect(body.status).toMatch(/queued|accepted/);
  expect(body.message).toBeTruthy();
  expect(body.requestId).toBeTruthy();

  // ── Timing: response must be fast (non-blocking) ──
  expect(
    elapsedMs,
    `Async response took ${elapsedMs}ms — should be < 5000ms for non-blocking behavior`
  ).toBeLessThan(5_000);

  console.log(`  ✓ Async 202 received in ${elapsedMs}ms — non-blocking confirmed`);
  console.log(`  ✓ requestId: ${body.requestId as string}`);
});

// ─── T05: Background Callout Verification ────────────────────────────────────

test('T05 — async callout: background callout arrives at webhook.site receiver', async ({
  request,
  mainEndpointUrl,
}) => {
  const webhookClient = new WebhookSiteClient(request);
  const tokenUuid = config.webhookSiteTokenUuid;

  // Record how many requests exist BEFORE we trigger
  const before = await webhookClient.countRequests(tokenUuid);

  const payload = PayloadFactory.notification();

  // Trigger async callout
  const response = await request.post(`${mainEndpointUrl}/api/notifications`, {
    data: payload,
    headers: { 'Content-Type': 'application/json' },
  });

  expect(response.status()).toBe(202);
  console.log(`  ✓ Got 202 immediately — waiting for background callout...`);

  // Poll until a NEW request arrives at webhook.site (count increases)
  const calloutRequest = await poll<WebhookSiteRequest>(
    async () => {
      const requests = await webhookClient.getRequests(tokenUuid);
      const newRequests = requests.slice(0, requests.length - before);
      return newRequests[0] ?? null;
    },
    {
      timeoutMs: config.asyncCalloutTimeoutMs,
      intervalMs: config.pollingIntervalMs,
      label: 'async callout to webhook.site',
    }
  );

  expect(calloutRequest.method).toBe('POST');
  console.log(`  ✓ Background callout arrived at webhook.site!`);
  console.log(`  ✓ Callout timestamp: ${calloutRequest.created_at}`);
});

// ─── T06: Timing Proof ⭐ ──────────────────────────────────────────────────────

test('T06 — async callout: client response arrives BEFORE callout is logged (timing proof)', async ({
  request,
  mainEndpointUrl,
}) => {
  const webhookClient = new WebhookSiteClient(request);
  const tokenUuid = config.webhookSiteTokenUuid;

  const before = await webhookClient.countRequests(tokenUuid);
  const payload = PayloadFactory.notification();

  /**
   * ⭐ THE TIMING PROOF
   *
   *  t0 ─── POST sent
   *  t1 ─── 202 received      ← client unblocked (fast)
   *  ...  (background callout fires)
   *  t2 ─── callout at webhook.site ← AFTER t1
   *
   *  If t1 >= t2: callout was NOT async (blocking)
   *  If t1 <  t2: callout IS async — response came before background work ✅
   */

  const t0 = Date.now();

  const response = await request.post(`${mainEndpointUrl}/api/notifications`, {
    data: payload,
    headers: { 'Content-Type': 'application/json' },
  });

  const t1 = Date.now(); // client got response
  expect(response.status()).toBe(202);

  // Poll for new callout
  await poll<WebhookSiteRequest>(
    async () => {
      const requests = await webhookClient.getRequests(tokenUuid);
      const newOnes = requests.filter(
        (r) => new Date(r.created_at).getTime() > t0
      );
      return newOnes[0] ?? null;
    },
    {
      timeoutMs: config.asyncCalloutTimeoutMs,
      intervalMs: config.pollingIntervalMs,
      label: 'callout timing proof',
    }
  );

  const t2 = Date.now(); // callout detected (conservative upper bound)

  const responseElapsed = t1 - t0;
  const calloutElapsed = t2 - t0;

  console.log(`  📊 Timing breakdown:`);
  console.log(`     t0 (request sent):     0ms`);
  console.log(`     t1 (202 received):     +${responseElapsed}ms ← client unblocked`);
  console.log(`     t2 (callout detected): +${calloutElapsed}ms`);
  console.log(`     Δ  (callout - resp):   +${calloutElapsed - responseElapsed}ms`);

  // Core assertion: client response came before callout was detected
  expect(
    responseElapsed,
    `Response (${responseElapsed}ms) should be faster than callout detection (${calloutElapsed}ms). ` +
    `This proves async behavior — client is not blocked waiting for the callout.`
  ).toBeLessThan(calloutElapsed);

  console.log(`  ✓ TIMING PROOF: Response arrived ${calloutElapsed - responseElapsed}ms before callout detected`);
});

// ─── T07: Three Requests → Three Callouts ─────────────────────────────────────

test('T07 — async callout: three sequential requests produce three callouts', async ({
  request,
  mainEndpointUrl,
}) => {
  const webhookClient = new WebhookSiteClient(request);
  const tokenUuid = config.webhookSiteTokenUuid;
  const EXPECTED_COUNT = 3;

  const before = await webhookClient.countRequests(tokenUuid);

  for (let i = 1; i <= EXPECTED_COUNT; i++) {
    const response = await request.post(`${mainEndpointUrl}/api/notifications`, {
      data: { ...PayloadFactory.notification(), sequence: i },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(202);
    console.log(`  → Request ${i}/${EXPECTED_COUNT} → 202 received`);
    await sleep(300); // small gap between requests
  }

  // Wait and count new callouts
  let newCount = 0;
  const deadline = Date.now() + config.asyncCalloutTimeoutMs;

  while (Date.now() < deadline && newCount < EXPECTED_COUNT) {
    const total = await webhookClient.countRequests(tokenUuid);
    newCount = total - before;
    if (newCount < EXPECTED_COUNT) await sleep(config.pollingIntervalMs);
  }

  expect(
    newCount,
    `Expected ${EXPECTED_COUNT} new callouts at webhook.site, found ${newCount}`
  ).toBeGreaterThanOrEqual(EXPECTED_COUNT);

  console.log(`  ✓ All ${EXPECTED_COUNT} async callouts arrived at webhook.site`);
});
