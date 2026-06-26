import { sleep } from './polling';

// ─── Retry Options ────────────────────────────────────────────────────────────

interface RetryOptions {
  /** Number of retry attempts (not counting the first call) */
  retries?: number;
  /** Base delay in ms — doubles on each retry (exponential backoff) */
  baseDelayMs?: number;
  /** Optional label for logging */
  label?: string;
  /** If provided, only retry when this predicate returns true for the error */
  retryOn?: (error: unknown) => boolean;
}

// ─── Retry with Exponential Backoff ──────────────────────────────────────────

/**
 * Retries an async function with exponential backoff on failure.
 *
 * Useful for making resilient requests to external services (Beeceptor,
 * webhook.site) that may have transient rate limits or network hiccups.
 *
 * Delays: 300ms → 600ms → 1200ms
 *
 * @example
 * const result = await withRetry(
 *   () => webhookClient.createToken(),
 *   { retries: 3, baseDelayMs: 300, label: 'webhook.site token creation' }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 300,
    label = 'operation',
    retryOn,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry on this specific error
      if (retryOn && !retryOn(error)) {
        throw error;
      }

      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `  ⚠ Retry ${attempt + 1}/${retries} for "${label}" after ${delay}ms: ` +
          `${error instanceof Error ? error.message : String(error)}`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
