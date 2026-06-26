import { faker } from '@faker-js/faker';

// ─── Order Payload ────────────────────────────────────────────────────────────

export interface OrderPayload {
  orderId: string;
  customerId: string;
  productName: string;
  amount: number;
  currency: string;
  timestamp: string;
}

// ─── Notification Payload ─────────────────────────────────────────────────────

export interface NotificationPayload {
  notificationId: string;
  userId: string;
  event: string;
  email: string;
  timestamp: string;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Generates realistic, randomized test payloads using Faker.js.
 * No hardcoded test data — every run uses unique values, which helps
 * verify that payloads are actually forwarded (not cached/mocked).
 */
export const PayloadFactory = {

  /**
   * Generates a realistic e-commerce order payload.
   * Used in synchronous callout tests.
   */
  order(): OrderPayload {
    return {
      orderId: `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
      customerId: faker.string.uuid(),
      productName: faker.commerce.productName(),
      amount: parseFloat(faker.commerce.price({ min: 10, max: 9999 })),
      currency: faker.helpers.arrayElement(['INR', 'USD', 'EUR']),
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Generates a notification/event payload.
   * Used in asynchronous (fire-and-forget) callout tests.
   */
  notification(): NotificationPayload {
    return {
      notificationId: faker.string.uuid(),
      userId: faker.string.uuid(),
      event: faker.helpers.arrayElement([
        'user.signup',
        'order.placed',
        'payment.received',
        'subscription.renewed',
      ]),
      email: faker.internet.email(),
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Generates a payload with special characters to test encoding/forwarding.
   * Includes unicode, HTML entities, emoji, quotes.
   */
  specialChars(): Record<string, string> {
    return {
      name: `${faker.person.fullName()} & Co.`,
      description: `Product: "Beeceptor's <Test>" & more`,
      emoji: `🚀 Testing: ${faker.company.name()} 🐝`,
      unicode: `こんにちは ${faker.person.firstName()}`,
      sqlInjection: `'; DROP TABLE orders; --`,
      id: faker.string.uuid(),
    };
  },

  /**
   * Generates a large payload to test size handling.
   * ~60KB of data.
   */
  oversized(): Record<string, unknown> {
    return {
      id: faker.string.uuid(),
      description: faker.string.alphanumeric(30_000),
      metadata: faker.string.alphanumeric(30_000),
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Returns an empty body marker (used when testing no-body POSTs).
   */
  empty(): Record<string, never> {
    return {};
  },

  /**
   * Generates a correlation ID for header forwarding tests.
   */
  correlationId(): string {
    return `corr-${faker.string.uuid()}`;
  },
};
