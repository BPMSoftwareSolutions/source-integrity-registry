import { digestsBytes, digestsMatch, isSha256Digest, type Sha256Digest } from "../domain/digest.js";

/**
 * An immutable record of exactly the bytes a document was supplied as.
 *
 * The payload is base64 so the snapshot survives text normalization. A digest
 * witnesses bytes that still exist; it cannot reconstruct a missing preimage,
 * so the bytes themselves are retained here rather than only their identity.
 */
export interface DocumentationSnapshot {
  readonly snapshotType: "sir-documentation-snapshot.v1";
  readonly snapshotId: string;
  readonly suppliedPath: string;
  readonly byteLength: number;
  readonly sha256: Sha256Digest;
  readonly encoding: "base64";
  readonly contentBase64: readonly string[];
}

/**
 * A closed declaration binding an origin snapshot to one derived document
 * through one named transformation.
 *
 * Every participant is identified by digest, so proof can detect a change to
 * the origin, the transformation, or the derived output independently.
 */
export interface DocumentationDerivation {
  readonly derivationType: "sir-documentation-derivation.v1";
  readonly derivationId: string;
  readonly originSnapshotId: string;
  readonly originSha256: Sha256Digest;
  readonly transformation: {
    readonly transformationId: DocumentationTransformationId;
    readonly parameters: Readonly<Record<string, unknown>>;
  };
  readonly derivedPath: string;
  readonly derivedByteLength: number;
  readonly derivedSha256: Sha256Digest;
}

export type DocumentationTransformationId = "remove-blank-line-at-byte-offset.v1";

export type SnapshotFailureKind =
  | "SNAPSHOT_CONTRACT_INVALID"
  | "SNAPSHOT_ENCODING_INVALID"
  | "SNAPSHOT_LENGTH_MISMATCH"
  | "SNAPSHOT_DIGEST_MISMATCH";

export type DerivationFailureKind =
  | "DERIVATION_CONTRACT_INVALID"
  | "DERIVATION_ORIGIN_MISMATCH"
  | "DERIVATION_TRANSFORMATION_UNKNOWN"
  | "DERIVATION_TRANSFORMATION_INAPPLICABLE"
  | "DERIVATION_OUTPUT_LENGTH_MISMATCH"
  | "DERIVATION_OUTPUT_DIGEST_MISMATCH";

export interface DocumentationFailure {
  readonly kind: SnapshotFailureKind | DerivationFailureKind;
  readonly message: string;
}

export type OriginRecoveryResult =
  | { readonly outcome: "recovered"; readonly bytes: Uint8Array; readonly digest: Sha256Digest }
  | { readonly outcome: "failed"; readonly failure: DocumentationFailure };

export type DerivationResult =
  | { readonly outcome: "reproduced"; readonly bytes: Uint8Array; readonly digest: Sha256Digest }
  | { readonly outcome: "failed"; readonly failure: DocumentationFailure };

const BASE64_LINE = /^[A-Za-z0-9+/]*={0,2}$/u;

function fails(
  kind: SnapshotFailureKind | DerivationFailureKind,
  message: string
): { readonly outcome: "failed"; readonly failure: DocumentationFailure } {
  return { outcome: "failed", failure: { kind, message } };
}

/**
 * Admits a parsed value as a documentation snapshot.
 *
 * Structural admission is separate from byte recovery so an invalid snapshot is
 * rejected before anything attempts to decode it.
 */
export function isDocumentationSnapshot(value: unknown): value is DocumentationSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate["snapshotType"] === "sir-documentation-snapshot.v1" &&
    typeof candidate["snapshotId"] === "string" &&
    typeof candidate["suppliedPath"] === "string" &&
    typeof candidate["byteLength"] === "number" &&
    Number.isInteger(candidate["byteLength"]) &&
    (candidate["byteLength"] as number) >= 0 &&
    isSha256Digest(candidate["sha256"]) &&
    candidate["encoding"] === "base64" &&
    Array.isArray(candidate["contentBase64"]) &&
    (candidate["contentBase64"] as unknown[]).every((line) => typeof line === "string")
  );
}

export function isDocumentationDerivation(value: unknown): value is DocumentationDerivation {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const transformation = candidate["transformation"];
  if (typeof transformation !== "object" || transformation === null) {
    return false;
  }
  const transformationRecord = transformation as Record<string, unknown>;
  const parameters = transformationRecord["parameters"];

  return (
    candidate["derivationType"] === "sir-documentation-derivation.v1" &&
    typeof candidate["derivationId"] === "string" &&
    typeof candidate["originSnapshotId"] === "string" &&
    isSha256Digest(candidate["originSha256"]) &&
    typeof transformationRecord["transformationId"] === "string" &&
    typeof parameters === "object" &&
    parameters !== null &&
    typeof candidate["derivedPath"] === "string" &&
    typeof candidate["derivedByteLength"] === "number" &&
    Number.isInteger(candidate["derivedByteLength"]) &&
    (candidate["derivedByteLength"] as number) >= 0 &&
    isSha256Digest(candidate["derivedSha256"])
  );
}

/**
 * Recovers the exact supplied bytes from an admitted snapshot.
 *
 * The recovered bytes are re-measured and re-digested against the admitted
 * identity, so a snapshot whose payload was edited cannot present itself as
 * the original.
 */
export function recoversOriginBytes(snapshot: DocumentationSnapshot): OriginRecoveryResult {
  const joined = snapshot.contentBase64.join("");
  if (!BASE64_LINE.test(joined)) {
    return fails(
      "SNAPSHOT_ENCODING_INVALID",
      `${snapshot.snapshotId} payload is not a valid base64 sequence.`
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(joined, "base64"));
  } catch (cause) {
    return fails(
      "SNAPSHOT_ENCODING_INVALID",
      `${snapshot.snapshotId} payload could not be decoded: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
  }

  // Buffer.from ignores trailing garbage rather than refusing it, so a payload
  // that decodes to the wrong length must be caught explicitly.
  if (bytes.byteLength !== snapshot.byteLength) {
    return fails(
      "SNAPSHOT_LENGTH_MISMATCH",
      `${snapshot.snapshotId} decodes to ${bytes.byteLength} bytes but declares ${snapshot.byteLength}.`
    );
  }

  const digest = digestsBytes(bytes);
  if (!digestsMatch(digest, snapshot.sha256)) {
    return fails(
      "SNAPSHOT_DIGEST_MISMATCH",
      `${snapshot.snapshotId} decodes to ${digest} but declares ${snapshot.sha256}.`
    );
  }

  return { outcome: "recovered", bytes, digest };
}

/**
 * Applies a declared transformation to admitted origin bytes.
 *
 * Transformations are a closed set operating on bytes. An unknown
 * transformation is a failure rather than a pass-through, so a declaration can
 * never claim a derivation the implementation does not actually perform.
 */
export function appliesTransformation(
  originBytes: Uint8Array,
  transformation: DocumentationDerivation["transformation"]
): DerivationResult {
  if (transformation.transformationId !== "remove-blank-line-at-byte-offset.v1") {
    return fails(
      "DERIVATION_TRANSFORMATION_UNKNOWN",
      `Transformation ${String(transformation.transformationId)} is not admitted.`
    );
  }

  const offset = transformation.parameters["byteOffset"];
  const sequence = transformation.parameters["removedSequence"];
  if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) {
    return fails(
      "DERIVATION_CONTRACT_INVALID",
      "remove-blank-line-at-byte-offset.v1 requires an integer byteOffset parameter."
    );
  }
  if (typeof sequence !== "string" || sequence.length === 0) {
    return fails(
      "DERIVATION_CONTRACT_INVALID",
      "remove-blank-line-at-byte-offset.v1 requires a non-empty removedSequence parameter."
    );
  }

  const removed = Buffer.from(sequence, "utf8");
  const end = offset + removed.byteLength;
  if (end > originBytes.byteLength) {
    return fails(
      "DERIVATION_TRANSFORMATION_INAPPLICABLE",
      `Removal range ${offset}..${end} lies outside the ${originBytes.byteLength}-byte origin.`
    );
  }

  // The declared bytes must actually be present at the declared offset. Without
  // this the transformation would silently delete whatever happened to be
  // there, and the derived output would still match its digest by luck.
  const actual = Buffer.from(originBytes.subarray(offset, end));
  if (!actual.equals(removed)) {
    return fails(
      "DERIVATION_TRANSFORMATION_INAPPLICABLE",
      `Origin bytes at offset ${offset} are ${JSON.stringify(
        actual.toString("utf8")
      )}, not the declared ${JSON.stringify(sequence)}.`
    );
  }

  const output = new Uint8Array(originBytes.byteLength - removed.byteLength);
  output.set(originBytes.subarray(0, offset), 0);
  output.set(originBytes.subarray(end), offset);

  return { outcome: "reproduced", bytes: output, digest: digestsBytes(output) };
}

/**
 * Reproduces a derived document from an admitted origin snapshot.
 *
 * Every binding in the declaration is checked: a changed origin, an
 * inapplicable transformation, or an output that misses its declared identity
 * each fail closed. Nothing here writes to tracked authority.
 */
export function reproducesDerivedDocument(
  snapshot: DocumentationSnapshot,
  derivation: DocumentationDerivation
): DerivationResult {
  if (derivation.originSnapshotId !== snapshot.snapshotId) {
    return fails(
      "DERIVATION_ORIGIN_MISMATCH",
      `${derivation.derivationId} declares origin ${derivation.originSnapshotId}, not ${snapshot.snapshotId}.`
    );
  }
  if (!digestsMatch(derivation.originSha256, snapshot.sha256)) {
    return fails(
      "DERIVATION_ORIGIN_MISMATCH",
      `${derivation.derivationId} declares origin digest ${derivation.originSha256}, but ${snapshot.snapshotId} is ${snapshot.sha256}.`
    );
  }

  const recovery = recoversOriginBytes(snapshot);
  if (recovery.outcome === "failed") {
    return recovery;
  }

  const applied = appliesTransformation(recovery.bytes, derivation.transformation);
  if (applied.outcome === "failed") {
    return applied;
  }

  if (applied.bytes.byteLength !== derivation.derivedByteLength) {
    return fails(
      "DERIVATION_OUTPUT_LENGTH_MISMATCH",
      `${derivation.derivationId} reproduced ${applied.bytes.byteLength} bytes but declares ${derivation.derivedByteLength}.`
    );
  }
  if (!digestsMatch(applied.digest, derivation.derivedSha256)) {
    return fails(
      "DERIVATION_OUTPUT_DIGEST_MISMATCH",
      `${derivation.derivationId} reproduced ${applied.digest} but declares ${derivation.derivedSha256}.`
    );
  }

  return applied;
}
