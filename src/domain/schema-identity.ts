/** The only JSON Schema dialect SIR v0.1 admits. */
export const SUPPORTED_DIALECT = "https://json-schema.org/draft/2020-12/schema";

const SCHEMA_IDENTITY_PATTERN =
  /^https:\/\/schemas\.deterministic\.solutions\/sir\/([a-z0-9]+(?:-[a-z0-9]+)*)\/((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))\/schema\.json$/u;

export interface SchemaIdentity {
  readonly schemaId: string;
  readonly schemaFamily: string;
  readonly schemaVersion: string;
}

/**
 * Parses an exact schema identity URI.
 *
 * Returns undefined for any floating identifier — `latest`, `1.x`, `^1.0.0` —
 * because a durable payload must point to exactly one rule set.
 */
export function parsesSchemaIdentity(schemaId: string): SchemaIdentity | undefined {
  const match = SCHEMA_IDENTITY_PATTERN.exec(schemaId);
  if (match === null) {
    return undefined;
  }

  const [, schemaFamily, schemaVersion] = match;
  if (schemaFamily === undefined || schemaVersion === undefined) {
    return undefined;
  }

  return { schemaId, schemaFamily, schemaVersion };
}
