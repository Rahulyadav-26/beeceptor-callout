// ─── httpbin Response Schema ──────────────────────────────────────────────────

/**
 * AJV schema for httpbin.org/post response.
 *
 * WHY httpbin.org?
 * We originally used rahul-callout-recv as the sync callout target, but
 * Beeceptor cannot call its own free endpoints (self-referencing is blocked,
 * returning HTTP 582). httpbin.org is a well-known free HTTP testing service
 * that echoes back the forwarded request, making it BETTER for verification:
 *
 *   - body.json    → contains the forwarded request payload  (proves T02)
 *   - body.headers → contains forwarded request headers      (proves T03)
 *   - body.url     → confirms callout reached the target
 */
export const httpbinResponseSchema = {
  type: 'object',
  required: ['url', 'headers'],
  properties: {
    url: { type: 'string' },
    json: { type: 'object', nullable: true },
    data: { type: 'string' },
    headers: {
      type: 'object',
      required: [],
      additionalProperties: { type: 'string' },
    },
    origin: { type: 'string' },
  },
  additionalProperties: true,
} as const;

// ─── Receiver Response Schema (kept for reference) ───────────────────────────

/**
 * NOTE: This schema was used when rahul-callout-recv was the callout target.
 * Currently unused — httpbinResponseSchema is used for sync tests.
 */
export const receiverResponseSchema = {
  type: 'object',
  required: ['status', 'receivedAt', 'receiverId'],
  properties: {
    status: { type: 'string', const: 'received' },
    receivedAt: { type: 'string' },
    receiverId: { type: 'string' },
  },
  additionalProperties: true,
} as const;

// ─── Async Immediate Response Schema ─────────────────────────────────────────

/**
 * AJV schema for the immediate 202 response returned during async callout.
 * Client gets this instantly; actual callout fires in background.
 */
export const asyncImmediateResponseSchema = {
  type: 'object',
  required: ['status', 'message', 'requestId'],
  properties: {
    status: { type: 'string', enum: ['queued', 'accepted'] },
    message: { type: 'string', minLength: 1 },
    requestId: { type: 'string', minLength: 1 },
  },
  additionalProperties: true,
} as const;

// ─── Generic Success Response Schema ─────────────────────────────────────────

export const successResponseSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string' },
  },
  additionalProperties: true,
} as const;
