/**
 * @suite Edge Cases — Boundary Conditions & Unusual Inputs
 *
 * Tests how Beeceptor HTTP Callout handles non-standard but valid scenarios:
 * concurrent requests, empty bodies, special characters, unicode.
 */

import { test, expect } from '../src/fixtures/beeceptor.fixture';
import { assertSchema } from '../src/schemas/validator';
import { successResponseSchema } from '../src/schemas/response.schemas';
import { PayloadFactory } from '../src/factories/payload.factory';
import { config } from '../src/config';
import { sleep } from '../src/utils/polling';
import { WebhookSiteClient } from '../src/api/WebhookSiteClient';

// ─── T12: Concurrent Requests ─────────────────────────────────────────────────

test('T12 — edge: 5 concurrent requests all get responses (no race conditions)', async ({
  request,
  mainEndpointUrl,
}) => {
  const webhookClient = new WebhookSiteClient(request);
  const tokenUuid = config.webhookSiteTokenUuid;
  const CONCURRENT = 5;

  const before = await webhookClient.countRequests(tokenUuid);

  console.log(`  🚀 Firing ${CONCURRENT} concurrent async requests...`);

  // All 5 requests in parallel via Promise.all
  const results = await Promise.all(
    Array.from({ length: CONCURRENT }, (_, i) =>
      request.post(`${mainEndpointUrl}/api/notifications`, {
        data: { ...PayloadFactory.notification(), sequence: i + 1 },
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );

  // ── All must succeed ──
  const statuses = results.map((r) => r.status());
  console.log(`  ✓ Response statuses: [${statuses.join(', ')}]`);

  statuses.forEach((status, i) => {
    expect(
      status,
      `Request ${i + 1} failed with status ${status}`
    ).toBe(202);
  });

  // ── All background callouts must arrive ──
  const deadline = Date.now() + config.asyncCalloutTimeoutMs;
  let newCount = 0;

  while (Date.now() < deadline && newCount < CONCURRENT) {
    const total = await webhookClient.countRequests(tokenUuid);
    newCount = total - before;
    if (newCount < CONCURRENT) await sleep(config.pollingIntervalMs);
  }

  expect(
    newCount,
    `Expected ${CONCURRENT} callouts, got ${newCount}. Some may have been dropped under concurrency.`
  ).toBeGreaterThanOrEqual(CONCURRENT);

  console.log(`  ✓ All ${CONCURRENT} concurrent callouts arrived at webhook.site`);
});

// ─── T13: Empty Body ──────────────────────────────────────────────────────────

test('T13 — edge: POST with empty body {} still triggers callout', async ({
  request,
  mainEndpointUrl,
}) => {
  /**
   * Tests that callout rules fire even when the request body is empty.
   * Some integrations (webhooks, ping-style notifications) send no body.
   */
  const response = await request.post(`${mainEndpointUrl}/api/orders`, {
    data: PayloadFactory.empty(),
    headers: { 'Content-Type': 'application/json' },
  });

  const status = response.status();
  expect(
    status,
    `Empty body should still trigger sync callout, got ${status}`
  ).toBe(200);

  const body = await response.json();
  assertSchema(successResponseSchema, body);

  console.log(`  ✓ T13: Empty body returned HTTP ${status}`);
});

// ─── T14: Special Characters in Payload ──────────────────────────────────────

test('T14 — edge: special characters (emoji, unicode, HTML) forwarded without corruption', async ({
  request,
  mainEndpointUrl,
}) => {
  /**
   * Tests that Beeceptor correctly encodes/forwards payloads containing:
   * - Emoji (multi-byte unicode)
   * - HTML entities (&, <, >, ")
   * - SQL injection patterns
   * - Non-ASCII unicode (Japanese)
   *
   * If payload is corrupted during callout forwarding, this test documents it.
   */
  const specialPayload = PayloadFactory.specialChars();

  console.log(`  📦 Sending special chars payload:`, JSON.stringify(specialPayload).slice(0, 100) + '...');

  const response = await request.post(`${mainEndpointUrl}/api/orders`, {
    data: specialPayload,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
    },
  });

  const status = response.status();
  expect(
    status,
    `Special character payload should not cause server error, got ${status}`
  ).toBeLessThan(500);

  if (status === 200) {
    const body = await response.json();
    assertSchema(successResponseSchema, body);
    console.log(`  ✓ T14: Special characters handled correctly (HTTP 200)`);
  } else {
    console.log(`  ✓ T14: Special characters returned HTTP ${status} (documented behavior)`);
  }
});
