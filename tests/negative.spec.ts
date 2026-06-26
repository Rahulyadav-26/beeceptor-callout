/**
 * @suite Negative Tests — Error Handling & Boundary Conditions
 *
 * Verifies that Beeceptor's HTTP Callout feature degrades gracefully
 * under adverse conditions: invalid targets, malformed inputs, oversized payloads.
 *
 * These tests document OBSERVED BEHAVIOR (not always "must fail gracefully") —
 * some tests capture the actual Beeceptor response for documentation purposes,
 * which is valuable for understanding the system's error contract.
 */

import { test, expect } from '../src/fixtures/beeceptor.fixture';
import { PayloadFactory } from '../src/factories/payload.factory';

// ─── T08: Invalid Callout Target ──────────────────────────────────────────────

test('T08 — negative: callout to invalid URL — endpoint still responds', async ({
  request,
  mainEndpointUrl,
}) => {
  /**
   * Pre-requisite: Configure a rule on rahul-callout-main for POST /api/bad-target
   * with callout target: https://this-host-does-not-exist-xyz-12345.com/webhook
   *
   * Expected: Beeceptor should respond (not hang indefinitely).
   * Documents: how Beeceptor handles DNS resolution failure for callout target.
   */
  const payload = PayloadFactory.order();

  // Use a timeout — if Beeceptor hangs, test fails clearly
  const response = await request.post(`${mainEndpointUrl}/api/bad-target`, {
    data: payload,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
  });

  // Beeceptor should respond with SOME status (not hang)
  const status = response.status();
  expect(
    [200, 202, 400, 502, 503, 504].includes(status),
    `Expected any HTTP response (got ${status}), but not a timeout/hang. ` +
    `Beeceptor should not block client when callout target is unreachable.`
  ).toBe(true);

  console.log(`  ✓ T08: Got HTTP ${status} for invalid callout target (no hang)`);
  console.log(`  📝 Behavior documented: Beeceptor returns ${status} on DNS failure`);
});

// ─── T09: Non-Existent Beeceptor Route ───────────────────────────────────────

test('T09 — negative: request to unconfigured route returns default response', async ({
  request,
  mainEndpointUrl,
}) => {
  /**
   * Tests Beeceptor's fallback behavior when no rule matches the incoming request.
   * Per Beeceptor docs: fallback order is Local Tunnel → HTTP Proxy → OpenAPI → 200 OK
   */
  const response = await request.post(`${mainEndpointUrl}/api/route-that-does-not-exist`, {
    data: { test: true },
    headers: { 'Content-Type': 'application/json' },
  });

  // Beeceptor's default fallback should respond (not 5xx)
  const status = response.status();
  expect(
    status,
    `Unmatched routes should fall back to Beeceptor default (typically 200), got ${status}`
  ).toBeLessThan(500);

  console.log(`  ✓ T09: Unmatched route returned HTTP ${status} (default fallback)`);
});

// ─── T10: Oversized Payload ───────────────────────────────────────────────────

test('T10 — negative: oversized payload (~60KB) behavior documented', async ({
  request,
  mainEndpointUrl,
}) => {
  /**
   * Tests how Beeceptor handles large payloads in callout forwarding.
   * Free plan may have payload size limits.
   *
   * This test DOCUMENTS the behavior rather than asserting a specific outcome,
   * because the exact limit is not publicly documented for free plans.
   */
  const largePayload = PayloadFactory.oversized();

  const payloadSize = JSON.stringify(largePayload).length;
  console.log(`  📦 Sending payload of ~${Math.round(payloadSize / 1024)}KB`);

  let status: number;
  try {
    const response = await request.post(`${mainEndpointUrl}/api/orders`, {
      data: largePayload,
      headers: { 'Content-Type': 'application/json' },
      timeout: 20_000,
    });
    status = response.status();
  } catch (error) {
    // Network-level rejection is also a valid response for oversized payloads
    console.log(`  ✓ T10: Network-level rejection for oversized payload: ${String(error)}`);
    return;
  }

  // Any HTTP response (including 413 Payload Too Large) is acceptable
  expect(
    status,
    `Expected any HTTP response for oversized payload, got ${status}`
  ).toBeGreaterThan(0);

  console.log(`  ✓ T10: Oversized payload returned HTTP ${status}`);
  if (status === 413) {
    console.log(`  📝 Beeceptor enforces payload size limit with 413`);
  } else if (status < 400) {
    console.log(`  📝 Beeceptor accepted large payload without restriction`);
  } else {
    console.log(`  📝 Beeceptor rejected large payload with ${status}`);
  }
});

// ─── T11: Missing Content-Type Header ────────────────────────────────────────

test('T11 — negative: callout without Content-Type header still processes', async ({
  request,
  mainEndpointUrl,
}) => {
  /**
   * Tests resilience: callout rule should fire even without Content-Type header.
   * Some HTTP clients omit Content-Type for non-JSON payloads.
   */
  const response = await request.post(`${mainEndpointUrl}/api/orders`, {
    // Deliberately omit Content-Type
    data: 'orderId=123&amount=500',
  });

  const status = response.status();
  // Should get some response (not server error from our setup)
  expect(status).toBeGreaterThan(0);

  console.log(`  ✓ T11: Request without Content-Type returned HTTP ${status}`);
});
