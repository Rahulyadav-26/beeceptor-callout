import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// ─── Singleton AJV Instance ───────────────────────────────────────────────────

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// ─── Schema Validator ─────────────────────────────────────────────────────────

/**
 * Validates a response body against a JSON Schema.
 *
 * @param schema - AJV-compatible JSON Schema
 * @param data   - The parsed response body to validate
 * @throws Error with detailed AJV error messages if validation fails
 *
 * @example
 * const body = await response.json();
 * assertSchema(receiverResponseSchema, body);
 */
export function assertSchema(schema: object, data: unknown): void {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    const errors = ajv.errorsText(validate.errors, { separator: '\n  → ' });
    throw new Error(
      `❌ Schema validation failed:\n  → ${errors}\n\n` +
      `Received:\n${JSON.stringify(data, null, 2)}`
    );
  }
}

export { ajv };
