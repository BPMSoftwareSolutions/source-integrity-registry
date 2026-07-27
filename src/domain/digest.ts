import { createHash } from "node:crypto";

/** A sha256 digest rendered with its explicit algorithm prefix. */
export type Sha256Digest = `sha256:${string}`;

const SHA256_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;

/**
 * Digests raw bytes.
 *
 * Bytes, never decoded text: decoding would let encoding choices and line
 * ending normalization change the digest of unchanged content.
 */
export function digestsBytes(bytes: Uint8Array): Sha256Digest {
  const hex = createHash("sha256").update(bytes).digest("hex");
  return `sha256:${hex}`;
}

export function isSha256Digest(candidate: unknown): candidate is Sha256Digest {
  return typeof candidate === "string" && SHA256_DIGEST_PATTERN.test(candidate);
}

/**
 * Compares digests without leaking a partial-match signal through early exit.
 *
 * Digest comparison here is an integrity check rather than a secret
 * comparison, but constant-shape comparison costs nothing and keeps the
 * primitive safe if it is ever reused for authenticated digests.
 */
export function digestsMatch(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}
