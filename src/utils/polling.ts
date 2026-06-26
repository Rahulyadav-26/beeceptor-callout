// ─── Polling Utility ──────────────────────────────────────────────────────────

interface PollOptions {
  /** Maximum wait time in milliseconds */
  timeoutMs: number;
  /** How long to wait between attempts */
  intervalMs: number;
  /** Human-readable label for timeout error messages */
  label: string;
}

/**
 * Polls an async function until it returns a non-null value or times out.
 *
 * Used primarily to verify that async (fire-and-forget) callouts have
 * arrived at the receiver, since there's an inherent delay between the
 * client getting a response and the background callout being processed.
 *
 * @example
 * const request = await poll(
 *   () => webhookClient.findRequest(token, r => r.method === 'POST'),
 *   { timeoutMs: 10_000, intervalMs: 800, label: 'async callout to webhook.site' }
 * );
 */
export async function poll<T>(
  fn: () => Promise<T | null>,
  options: PollOptions
): Promise<T> {
  const { timeoutMs, intervalMs, label } = options;
  const deadline = Date.now() + timeoutMs;

  let attempts = 0;

  while (Date.now() < deadline) {
    attempts++;
    const result = await fn();

    if (result !== null) {
      console.log(`  ✓ poll: "${label}" resolved after ${attempts} attempt(s)`);
      return result;
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `⏰ Polling timeout after ${timeoutMs}ms (${attempts} attempts): "${label}"\n` +
    `  This may indicate the async callout did not fire within the expected window.`
  );
}

// ─── Sleep Utility ────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
