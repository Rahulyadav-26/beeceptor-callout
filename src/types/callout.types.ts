// ─── HTTP Method ─────────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ─── Callout Modes ───────────────────────────────────────────────────────────

/**
 * Synchronous: Beeceptor waits for callout response and forwards it to client.
 * Asynchronous: Beeceptor returns immediate response; callout fires in background.
 */
export type CalloutMode = 'synchronous' | 'asynchronous';

// ─── Generic API Response ─────────────────────────────────────────────────────

export interface BeeceptorResponse {
  status: string;
  message?: string;
  [key: string]: unknown;
}

// ─── Sync Callout Response ────────────────────────────────────────────────────

/**
 * Response returned by the RECEIVER endpoint (rahul-callout-recv).
 * In sync mode, Beeceptor forwards this back to the original caller.
 */
export interface ReceiverResponse {
  status: 'received';
  receivedAt: string;
  receiverId: string;
  echoData?: Record<string, unknown>;
}

// ─── Async Callout Response ───────────────────────────────────────────────────

/**
 * Immediate response from main endpoint in async/fire-and-forget mode.
 * Client gets this instantly; callout fires in background.
 */
export interface AsyncImmediateResponse {
  status: 'queued' | 'accepted';
  message: string;
  requestId: string;
}

// ─── Test Timing Data ─────────────────────────────────────────────────────────

export interface TimingResult {
  startMs: number;
  responseReceivedMs: number;
  calloutDetectedMs: number;
  responseElapsedMs: number;
  calloutElapsedMs: number;
}
