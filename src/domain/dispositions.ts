/**
 * The closed set of signals the SIR validation circuit may produce.
 *
 * The circuit is one transistor. Findings may be numerous; the disposition is
 * always exactly one value from this set.
 */
export const DISPOSITIONS = [
  "REGISTRY_CONTRACT_VALID",
  "REGISTRY_CONTRACT_INVALID",
  "SCHEMA_NOT_ADMITTED",
  "SCHEMA_DIGEST_MISMATCH",
  "SOURCE_BODY_DRIFT"
] as const;

export type Disposition = (typeof DISPOSITIONS)[number];

/**
 * Process exit codes for the `sir` CLI.
 *
 * These are part of the published package contract: pipelines branch on them,
 * so they are as immutable as the schemas themselves.
 */
export const EXIT_CODE = {
  REGISTRY_VALID: 0,
  INVALID_ARGUMENTS: 2,
  SCHEMA_NOT_ADMITTED: 3,
  SCHEMA_DIGEST_MISMATCH: 4,
  REGISTRY_CONTRACT_INVALID: 5,
  EXECUTION_FAILURE: 6
} as const;

export type ExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE];

const DISPOSITION_EXIT_CODES: Readonly<Record<Disposition, ExitCode>> = {
  REGISTRY_CONTRACT_VALID: EXIT_CODE.REGISTRY_VALID,
  REGISTRY_CONTRACT_INVALID: EXIT_CODE.REGISTRY_CONTRACT_INVALID,
  SCHEMA_NOT_ADMITTED: EXIT_CODE.SCHEMA_NOT_ADMITTED,
  SCHEMA_DIGEST_MISMATCH: EXIT_CODE.SCHEMA_DIGEST_MISMATCH,
  /**
   * Physical drift is a failure of the registry's declared truth against the
   * observed workspace, so it reports through the contract-invalid channel
   * rather than claiming a distinct exit code not in the published contract.
   */
  SOURCE_BODY_DRIFT: EXIT_CODE.REGISTRY_CONTRACT_INVALID
};

export function resolvesExitCodeForDisposition(disposition: Disposition): ExitCode {
  return DISPOSITION_EXIT_CODES[disposition];
}
